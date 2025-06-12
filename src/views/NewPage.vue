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
        ></el-input>
        <el-button type="primary" @click="parseJson">解析数组</el-button>
      </el-form-item>
    </div>

    <!-- 属性选择区域 -->
    <div class="selection-section" v-if="allProperties.length > 0">
      <el-form-item label="选择标识属性(用于区分数据，多选)">
        <el-checkbox-group v-model="identifierProperties">
          <el-checkbox v-for="prop in allProperties" :key="prop" :label="prop"></el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="选择要展示的数值属性(多选)">
        <el-checkbox-group v-model="selectedProperties">
          <el-checkbox v-for="prop in numericProperties" :key="prop" :label="prop"></el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="选择校验属性(单选)">
        <el-radio-group v-model="checkProperty">
          <el-radio v-for="prop in numericProperties" :key="prop" :label="prop"></el-radio>
        </el-radio-group>
      </el-form-item>

      <el-button type="success" @click="analyzeData" :disabled="!identifierProperties.length || !selectedProperties.length || !checkProperty">开始分析</el-button>
    </div>

    <!-- 结果展示区域 -->
    <div class="result-section" v-if="analysisResults.length > 0">
      <h2>分析结果</h2>
      <el-table :data="analysisResults" border style="width: 100%">
        <el-table-column v-for="prop in identifierProperties" :key="prop" :prop="prop" :label="'标识(' + prop + ')'"></el-table-column>
        <el-table-column v-for="prop in selectedProperties" :key="prop" :prop="prop" :label="prop"></el-table-column>
        <el-table-column prop="checkPropertyValue" :label="checkProperty + '(校验值)'"></el-table-column>
        <el-table-column prop="sumValue" label="选中属性总和"></el-table-column>
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
const allProperties = ref([])
const identifierProperties = ref([]) // 修改为数组，支持多选
const numericProperties = ref([])
const selectedProperties = ref([])
const checkProperty = ref('')
const analysisResults = ref([])
const summary = ref(null)

// 解析JSON输入
const parseJson = () => {
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
    numericProperties.value = getNumericProperties(firstItem)
    
    // 重置选择
    identifierProperties.value = [] // 修改为数组
    selectedProperties.value = []
    checkProperty.value = ''
    analysisResults.value = []
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

// 分析数据并进行校验
const analyzeData = () => {
  if (!parsedData.value.length) {
    ElMessage.error('请先解析有效的对象数组')
    return
  }
  
  // 修复：添加 .value 访问响应式数组的值
  if (!identifierProperties.value.length) {
    ElMessage.warning('请至少选择一个标识属性')
    return
  }
  
  if (!selectedProperties.value.length) {
    ElMessage.warning('请至少选择一个要展示的数值属性')
    return
  }
  
  if (!checkProperty.value) {
    ElMessage.warning('请选择一个校验属性')
    return
  }

  // 处理分析结果
  analysisResults.value = parsedData.value.map((item) => {
    const result = {}
    // 添加所有选中的标识属性值
    identifierProperties.value.forEach(prop => {
      result[prop] = item[prop]
    })
    
    // 添加选中的属性值
    selectedProperties.value.forEach(prop => {
      result[prop] = item[prop]
    })
    
    // 计算选中属性的总和
    const sum = selectedProperties.value.reduce((acc, prop) => acc + item[prop], 0)
    result.sumValue = sum
    
    // 添加校验属性值和结果
    result.checkPropertyValue = item[checkProperty.value]
    result.isValid = sum === item[checkProperty.value]
    
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
</style>