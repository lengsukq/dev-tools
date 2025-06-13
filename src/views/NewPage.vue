<template>
  <div class="new-page">
    <h1>对象数组属性校验工具</h1>

    <!-- 输入区域 -->
    <div class="input-section">
      <el-form-item label="对象数组输入(JSON格式)">
        <el-input
          type="textarea"
          v-model="jsonInput"
          :rows="6"
          placeholder='请输入对象数组，例如：[{"id":1, "name":"数据1", "value1":10, "value2":20, "check":30}, {"id":2, "name":"数据2", "value1":15, "value2":25, "check":40}]'
          :disabled="isAnalyzing"
        ></el-input>
        <el-button type="primary" @click="parseJson" :disabled="isAnalyzing">解析数组</el-button>
      </el-form-item>
    </div>

    <!-- 属性选择区域 -->
    <div class="selection-section" v-if="allProperties.length > 0">
      <!-- 标识属性选择 - 改为el-select多选并支持模糊搜索 -->
      <el-form-item label="选择标识属性(用于区分数据，多选，支持搜索)">
        <el-select
          v-model="identifierProperties"
          multiple
          filterable
          placeholder="请选择标识属性"
          style="width: 100%"
          :disabled="isAnalyzing"
        >
          <el-option
            v-for="prop in allProperties"
            :key="prop"
            :label="prop"
            :value="prop"
          ></el-option>
        </el-select>
      </el-form-item>

      <!-- 要展示的属性选择 - 改为el-select多选并支持模糊搜索 -->
      <el-form-item label="选择要展示的属性(多选，支持搜索)">
        <el-select
          v-model="selectedProperties"
          multiple
          filterable
          placeholder="请选择要展示的属性"
          style="width: 100%"
          :disabled="isAnalyzing"
        >
          <el-option
            v-for="prop in allProperties"
            :key="prop"
            :label="prop"
            :value="prop"
          ></el-option>
        </el-select>
      </el-form-item>

      <!-- 校验属性选择 - 改为el-select单选并支持模糊搜索 -->
      <el-form-item label="选择校验属性(单选，必须为数值类型，支持搜索)">
        <el-select
          v-model="checkProperty"
          filterable
          placeholder="请选择校验属性"
          style="width: 100%"
          :disabled="isAnalyzing"
        >
          <el-option
            v-for="prop in numericProperties"
            :key="prop"
            :label="prop"
            :value="prop"
          ></el-option>
        </el-select>
      </el-form-item>

      <div class="action-buttons">
        <el-button
          type="success"
          @click="analyzeData"
          :disabled="!identifierProperties.length || !selectedProperties.length || !checkProperty || isAnalyzing"
        >
          <template v-if="isAnalyzing">
            <el-icon class="el-icon-loading mr-2"></el-icon>分析中...
          </template>
          <template v-else>开始分析</template>
        </el-button>

        <el-button
          v-if="isAnalyzing || analysisResults.length > 0"
          type="danger"
          @click="stopAnalysis"
          :disabled="!isAnalyzing && analysisResults.length === 0"
        >
          停止分析并清空结果
        </el-button>
      </div>
    </div>

    <!-- 结果展示区域 -->
    <div class="result-section" v-if="analysisResults.length > 0">
      <h2>分析结果</h2>
      <el-table :data="analysisResults" border style="width: 100%;" height="500">
        <!-- 标识属性 -->
        <el-table-column fixed v-for="prop in identifierProperties" :key="prop" :prop="prop" :label="'标识(' + prop + ')'"></el-table-column>
        <!-- 展示属性（现在支持所有类型） -->
        <el-table-column v-for="prop in selectedProperties" :key="prop" :prop="prop" :label="prop"></el-table-column>
        <!-- 校验属性值 -->
        <el-table-column prop="checkPropertyValue" :label="checkProperty + '(校验值)'"></el-table-column>
        <!-- 选中数值属性总和 -->
        <el-table-column prop="sumNumericValue" label="选中数值属性总和"></el-table-column>
        <el-table-column prop="isValid" label="校验结果" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isValid ? 'success' : 'danger'">{{ scope.row.isValid ? '通过' : '不通过' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="summary" v-if="summary">
        <el-alert :title="summary.title" :description="summary.message" :type="summary.type" show-icon></el-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 数据状态
const jsonInput = ref('')
const parsedData = ref([])
const allProperties = ref([]) // 所有属性
const identifierProperties = ref([]) // 标识属性，从 allProperties 中选择
const numericProperties = ref([]) // 纯数值属性，用于校验属性的选择
const selectedProperties = ref([]) // 要展示的属性，从 allProperties 中选择
const checkProperty = ref('') // 校验属性，从 numericProperties 中选择
const analysisResults = ref([])
const summary = ref(null)
const isAnalyzing = ref(false) // 添加分析状态

// 解析JSON输入
const parseJson = () => {
  if (isAnalyzing.value) { // 防止在分析过程中修改输入
    ElMessage.warning('请先停止当前分析过程。')
    return;
  }
  try {
    if (!jsonInput.value.trim()) {
      ElMessage.warning('请输入JSON数据')
      return
    }

    const data = JSON.parse(jsonInput.value)
    if (!Array.isArray(data) || data.length === 0) {
      ElMessage.error('请输入有效的对象数组')
      return
    }

    // 验证是否为对象数组
    if (!data.every(item => typeof item === 'object' && item !== null)) {
      ElMessage.error('数组中必须包含对象')
      return
    }

    parsedData.value = data
    // 提取所有属性和数值属性
    const firstItem = data[0]
    allProperties.value = firstItem ? Object.keys(firstItem) : []
    numericProperties.value = getNumericProperties(firstItem) // 仅用于校验属性的筛选

    // 重置选择
    identifierProperties.value = []
    selectedProperties.value = []
    checkProperty.value = ''
    analysisResults.value = [] // 清空结果，因为数据源可能变了
    summary.value = null

    ElMessage.success(`数组解析成功，共发现 ${allProperties.value.length} 个属性，其中 ${numericProperties.value.length} 个数值属性`)
  } catch (error) {
    ElMessage.error('JSON解析失败: ' + error.message)
  }
}

// 获取对象中的数值属性
const getNumericProperties = (obj) => {
  return obj ? Object.keys(obj).filter(key => typeof obj[key] === 'number') : []
}

// 用于模拟可取消的异步操作
let analysisTimeout = null;

// 分析数据并进行校验
const analyzeData = async () => {
  if (!parsedData.value.length) {
    ElMessage.error('请先解析有效的对象数组')
    return
  }

  if (!identifierProperties.value.length) {
    ElMessage.warning('请至少选择一个标识属性')
    return
  }

  if (!selectedProperties.value.length) {
    ElMessage.warning('请至少选择一个要展示的属性')
    return
  }

  if (!checkProperty.value) {
    ElMessage.warning('请选择一个校验属性')
    return
  }

  // 再次校验 checkProperty 必须是数值类型
  if (!numericProperties.value.includes(checkProperty.value)) {
    ElMessage.error(`校验属性 "${checkProperty.value}" 不是数值类型，请重新选择。`)
    return
  }

  if (isAnalyzing.value) { // 防止重复点击
    return;
  }

  try {
    isAnalyzing.value = true // 开始分析
    ElMessage.info('分析已开始，请稍候...')

    // 清空旧结果，准备新分析
    analysisResults.value = []
    summary.value = null

    // 使用setTimeout模拟异步分析过程，并支持取消
    await new Promise((resolve, reject) => {
      analysisTimeout = setTimeout(() => {
        // 如果在定时器触发前被停止，则不会执行后续逻辑
        if (!isAnalyzing.value) { // 检查isAnalyzing是否已被外部停止
          return reject(new Error('分析已被停止'));
        }

        // 处理分析结果
        analysisResults.value = parsedData.value.map((item) => {
          const result = {}
          // 添加所有选中的标识属性值
          identifierProperties.value.forEach(prop => {
            result[prop] = item[prop]
          })

          // 添加所有选中的展示属性值 (可以是任意类型)
          selectedProperties.value.forEach(prop => {
            result[prop] = item[prop]
          })

          // 计算选中属性中 "数值类型" 的总和
          const sum = selectedProperties.value.reduce((acc, prop) => {
            // 只有当属性是数值类型时才参与求和
            if (typeof item[prop] === 'number') {
              return acc + item[prop]
            }
            return acc
          }, 0)
          result.sumNumericValue = sum // 修改为 sumNumericValue，更明确

          // 添加校验属性值和结果
          const checkValue = item[checkProperty.value];
          // 确保校验值本身也是数字，防止意外情况
          result.checkPropertyValue = typeof checkValue === 'number' ? checkValue : null;

          result.isValid = sum === result.checkPropertyValue // 校验逻辑

          return result
        })

        // 生成汇总信息
        const total = analysisResults.value.length
        const validCount = analysisResults.value.filter(item => item.isValid).length
        summary.value = {
          title: `校验完成: ${validCount}/${total} 条数据通过`,
          message: validCount === total ? '所有数据均通过校验' : `${total - validCount} 条数据未通过校验`,
          type: validCount === total ? 'success' : 'warning'
        }
        resolve(); // 完成异步操作
      }, 1500) // 模拟分析耗时1.5秒
    })
  } catch (error) {
    if (error.message !== '分析已被停止') { // 忽略手动停止的错误
      ElMessage.error('分析过程出错: ' + error.message)
    } else {
      ElMessage.warning('分析已停止。')
    }
  } finally {
    isAnalyzing.value = false // 分析结束
    clearTimeout(analysisTimeout); // 清除定时器
    analysisTimeout = null;
  }
}

// 停止分析并清空结果
const stopAnalysis = () => {
  if (analysisTimeout) {
    clearTimeout(analysisTimeout); // 立即停止模拟的异步操作
    analysisTimeout = null;
  }
  isAnalyzing.value = false; // 停止分析状态
  analysisResults.value = []; // 清空结果
  summary.value = null; // 清空汇总信息
  ElMessage.info('分析已停止，结果已清空。您可以重新选择属性或解析新数据。');
}
</script>

<style scoped>
.new-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.input-section,
.selection-section,
.result-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.selection-section {
  background-color: #f9f9f9;
}

.result-section h2 {
  margin-bottom: 16px;
  color: #333;
}

.summary {
  margin-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 15px; /* 按钮之间的间距 */
  margin-top: 20px;
}
</style>