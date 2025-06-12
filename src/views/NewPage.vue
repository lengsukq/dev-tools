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
      <el-form-item label="选择标识属性(用于区分数据，多选)">
        <el-checkbox-group v-model="identifierProperties" :disabled="isAnalyzing">
          <el-checkbox v-for="prop in allProperties" :key="prop" :label="prop"></el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="选择要展示的数值属性(多选)">
        <el-checkbox-group v-model="selectedProperties" :disabled="isAnalyzing">
          <el-checkbox v-for="prop in numericProperties" :key="prop" :label="prop"></el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="选择校验属性(单选)">
        <el-radio-group v-model="checkProperty" :disabled="isAnalyzing">
          <el-radio v-for="prop in numericProperties" :key="prop" :label="prop"></el-radio>
        </el-radio-group>
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
      <!-- 使用 ElTableV2 -->
      <el-table-v2
        :columns="tableColumns"
        :data="analysisResults"
        :width="tableWidth"
        :height="500"
        fixed-data
        border
        style="width: 100%;"
      />

      <div class="summary" v-if="summary">
        <el-alert :title="summary.title" :description="summary.message" :type="summary.type" show-icon></el-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue' // 导入 computed
import { ElMessage, ElTableV2 } from 'element-plus' // 导入 ElTableV2

// 数据状态
const jsonInput = ref('')
const parsedData = ref([])
const allProperties = ref([])
const identifierProperties = ref([])
const numericProperties = ref([])
const selectedProperties = ref([])
const checkProperty = ref('')
const analysisResults = ref([])
const summary = ref(null)
const isAnalyzing = ref(false)

// 计算表格宽度，保证其响应式
const tableWidth = ref(0);
// 监听窗口大小变化
const updateTableWidth = () => {
  const resultSection = document.querySelector('.result-section');
  if (resultSection) {
    tableWidth.value = resultSection.offsetWidth;
  } else {
    tableWidth.value = 1000; // 默认宽度
  }
};
// 在组件挂载时设置初始宽度
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  updateTableWidth();
  window.addEventListener('resize', updateTableWidth);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateTableWidth);
});


// 定义表格列的计算属性
const tableColumns = computed(() => {
  const columns = [];
  const defaultColWidth = 120; // 默认列宽

  // 1. 添加标识属性列 (fixed)
  identifierProperties.value.forEach((prop, index) => {
    columns.push({
      key: prop,
      dataKey: prop,
      title: `标识(${prop})`,
      width: defaultColWidth,
      align: 'center',
      // 第一个标识列固定在左侧
      fixed: index === 0 ? 'left' : undefined,
    });
  });

  // 2. 添加选中的数值属性列
  selectedProperties.value.forEach(prop => {
    columns.push({
      key: prop,
      dataKey: prop,
      title: prop,
      width: defaultColWidth,
      align: 'center',
    });
  });

  // 3. 添加校验属性值列
  if (checkProperty.value) {
    columns.push({
      key: 'checkPropertyValue',
      dataKey: 'checkPropertyValue',
      title: `${checkProperty.value}(校验值)`,
      width: 150,
      align: 'center',
    });
  }


  // 4. 添加选中属性总和列
  columns.push({
    key: 'sumValue',
    dataKey: 'sumValue',
    title: '选中属性总和',
    width: 150,
    align: 'center',
  });

  // 5. 添加校验结果列 (fixed)
  columns.push({
    key: 'isValid',
    dataKey: 'isValid',
    title: '校验结果',
    width: 120,
    align: 'center',
    fixed: 'right', // 固定在右侧
    cellRenderer: ({ rowData }) => { // 自定义单元格渲染
      const type = rowData.isValid ? 'success' : 'danger';
      const text = rowData.isValid ? '通过' : '不通过';
      return (
        <el-tag type={type}>{text}</el-tag>
      );
    },
  });

  return columns;
});

// 解析JSON输入
const parseJson = () => {
  if (isAnalyzing.value) {
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

    if (!data.every(item => typeof item === 'object' && item !== null)) {
      ElMessage.error('数组中必须包含对象')
      return
    }

    parsedData.value = data
    const firstItem = data[0]
    allProperties.value = firstItem ? Object.keys(firstItem) : []
    numericProperties.value = getNumericProperties(firstItem)

    identifierProperties.value = []
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
    ElMessage.warning('请至少选择一个要展示的数值属性')
    return
  }

  if (!checkProperty.value) {
    ElMessage.warning('请选择一个校验属性')
    return
  }

  if (isAnalyzing.value) {
    return;
  }

  try {
    isAnalyzing.value = true
    ElMessage.info('分析已开始，请稍候...')

    analysisResults.value = []
    summary.value = null

    await new Promise((resolve, reject) => {
      analysisTimeout = setTimeout(() => {
        if (!isAnalyzing.value) {
          return reject(new Error('分析已被停止'));
        }

        analysisResults.value = parsedData.value.map((item, index) => {
          const result = { id: index }; // ElTableV2 建议每行有唯一的key，这里使用index
          // 添加所有选中的标识属性值
          identifierProperties.value.forEach(prop => {
            result[prop] = item[prop]
          })

          // 添加选中的属性值
          selectedProperties.value.forEach(prop => {
            result[prop] = item[prop]
          })

          // 计算选中属性的总和
          const sum = selectedProperties.value.reduce((acc, prop) => acc + (typeof item[prop] === 'number' ? item[prop] : 0), 0)
          result.sumValue = sum

          // 添加校验属性值和结果
          result.checkPropertyValue = item[checkProperty.value]
          result.isValid = sum === item[checkProperty.value]

          return result
        })

        const total = analysisResults.value.length
        const validCount = analysisResults.value.filter(item => item.isValid).length
        summary.value = {
          title: `校验完成: ${validCount}/${total} 条数据通过`,
          message: validCount === total ? '所有数据均通过校验' : `${total - validCount} 条数据未通过校验`,
          type: validCount === total ? 'success' : 'warning'
        }
        resolve();
      }, 1500)
    })
  } catch (error) {
    if (error.message !== '分析已被停止') {
      ElMessage.error('分析过程出错: ' + error.message)
    } else {
      ElMessage.warning('分析已停止。')
    }
  } finally {
    isAnalyzing.value = false
    clearTimeout(analysisTimeout);
    analysisTimeout = null;
  }
}

// 停止分析并清空结果
const stopAnalysis = () => {
  if (analysisTimeout) {
    clearTimeout(analysisTimeout);
    analysisTimeout = null;
  }
  isAnalyzing.value = false;
  analysisResults.value = [];
  summary.value = null;
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
  gap: 15px;
  margin-top: 20px;
}
</style>