// 全局变量
let history = [];
let generateCount = 0;
let totalSum = 0;
let uniqueStudents = new Set();
let repeatCount = 0;

// DOM 元素
const generateBtn = document.getElementById('generateBtn');
const nameplate = document.getElementById('nameplate');
const nameplateResult = document.getElementById('nameplateResult');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const countInput = document.getElementById('countInput');
const batchResults = document.getElementById('batchResults');

// 统计元素
const generateCountElement = document.getElementById('generateCount');
const averageValueElement = document.getElementById('averageValue');
const uniqueCountElement = document.getElementById('uniqueCount');
const repeatCountElement = document.getElementById('repeatCount');

// 学生状态跟踪
let studentWeights = {};
let lastSelectedStudents = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 初始化学生权重
    initializeStudentWeights();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 更新统计信息
    updateStats();
    
    console.log('初始化完成');
});

// 初始化学生权重
function initializeStudentWeights() {
    studentWeights = {};
    for (let i = 1; i <= 53; i++) {
        studentWeights[i] = 1.0;
    }
    console.log('学生权重初始化完成');
}

// 设置事件监听器
function setupEventListeners() {
    generateBtn.addEventListener('click', function() {
        console.log('点击了生成按钮');
        generateRandomNumbers();
    });
    
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // 名牌点击事件 - 手动翻转
    nameplate.addEventListener('click', function() {
        if (!nameplate.classList.contains('flipping')) {
            nameplate.classList.toggle('flipping');
        }
    });
    
    // 输入框验证
    countInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        if (value < 1) this.value = 1;
        if (value > 10) this.value = 10;
    });
}

// 随机数生成算法
function generateRandomNumber() {
    const weights = [];
    const numbers = [];
    
    for (let i = 1; i <= 53; i++) {
        numbers.push(i);
        weights.push(studentWeights[i] || 1.0);
    }
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < numbers.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return numbers[i];
        }
    }
    
    return numbers[Math.floor(Math.random() * numbers.length)];
}

// 生成随机数
function generateRandomNumbers() {
    const count = parseInt(countInput.value) || 1;
    
    if (count < 1 || count > 10) {
        alert('请选择1到10之间的个数！');
        return;
    }
    
    const results = [];
    const usedNumbers = new Set();
    
    // 生成不重复的数字
    while (results.length < count && usedNumbers.size < 53) {
        const newNumber = generateRandomNumber();
        if (!usedNumbers.has(newNumber)) {
            results.push(newNumber);
            usedNumbers.add(newNumber);
        }
    }
    
    console.log('生成结果:', results);
    
    // 显示结果
    displayResults(results);
    
    // 添加到历史记录
    addToHistory(results);
    
    // 更新学生权重
    updateStudentWeights(results);
    
    // 更新统计信息
    updateStats();
}

// 显示结果（带名牌翻转动画）
function displayResults(results) {
    if (results.length === 1) {
        // 单个结果 - 使用名牌翻转效果
        const result = results[0];
        
        // 重置名牌状态
        nameplate.classList.remove('flipping', 'glow');
        
        // 短暂延迟后开始翻转动画
        setTimeout(() => {
            // 更新背面内容
            nameplateResult.textContent = result;
            
            // 开始翻转动画
            nameplate.classList.add('flipping');
            
            // 如果是特殊数字，添加发光效果
            if ([4, 12, 29, 34].includes(result)) {
                setTimeout(() => {
                    nameplate.classList.add('glow');
                }, 600);
            }
        }, 100);
        
        batchResults.innerHTML = '';
    } else {
        // 多个结果
        nameplate.classList.remove('flipping', 'glow');
        nameplateResult.textContent = '?';
        batchResults.innerHTML = '';
        
        results.forEach(num => {
            const numberElement = document.createElement('div');
            numberElement.className = 'batch-number';
            numberElement.textContent = num;
            batchResults.appendChild(numberElement);
        });
    }
}

// 更新学生权重
function updateStudentWeights(selectedNumbers) {
    // 降低最近被点名的学生的权重
    lastSelectedStudents.forEach(num => {
        if (studentWeights[num] > 0.1) {
            studentWeights[num] = Math.max(0.1, studentWeights[num] * 0.3);
        }
    });
    
    // 更新最近选择的学生列表
    lastSelectedStudents = [...selectedNumbers];
    
    // 逐步恢复未点名学生的权重
    for (let i = 1; i <= 53; i++) {
        if (!lastSelectedStudents.includes(i)) {
            studentWeights[i] = Math.min(1.0, studentWeights[i] + 0.05);
        }
    }
}

// 添加到历史记录
function addToHistory(results) {
    const timestamp = new Date().toLocaleTimeString();
    
    let hasRepeat = false;
    results.forEach(num => {
        if (uniqueStudents.has(num)) {
            hasRepeat = true;
            repeatCount++;
        } else {
            uniqueStudents.add(num);
        }
    });
    
    if (results.length === 1) {
        history.unshift({
            type: 'single',
            value: results[0],
            timestamp: timestamp,
            isRepeat: hasRepeat
        });
        
        generateCount++;
        totalSum += results[0];
    } else {
        history.unshift({
            type: 'batch',
            values: results,
            timestamp: timestamp,
            isRepeat: hasRepeat
        });
        
        generateCount += results.length;
        results.forEach(num => totalSum += num);
    }
    
    // 限制历史记录长度
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    updateHistoryList();
}

// 更新历史记录列表
function updateHistoryList() {
    historyList.innerHTML = '';
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        if (item.isRepeat) {
            historyItem.style.borderLeft = '2px solid #ff6b6b';
        }
        
        if (item.type === 'single') {
            historyItem.innerHTML = `
                <span>学号: ${item.value} ${item.isRepeat ? '<i class="fas fa-redo-alt" style="color: #ff6b6b; margin-left: 5px;"></i>' : ''}</span>
                <span>${item.timestamp}</span>
            `;
        } else {
            historyItem.innerHTML = `
                <span>学号: ${item.values.join(', ')} ${item.isRepeat ? '<i class="fas fa-redo-alt" style="color: #ff6b6b; margin-left: 5px;"></i>' : ''}</span>
                <span>${item.timestamp}</span>
            `;
        }
        
        historyList.appendChild(historyItem);
    });
}

// 更新统计信息
function updateStats() {
    generateCountElement.textContent = generateCount;
    uniqueCountElement.textContent = uniqueStudents.size;
    repeatCountElement.textContent = repeatCount;
    
    if (generateCount > 0) {
        const average = (totalSum / generateCount).toFixed(2);
        averageValueElement.textContent = average;
    } else {
        averageValueElement.textContent = '0';
    }
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
        history = [];
        generateCount = 0;
        totalSum = 0;
        uniqueStudents.clear();
        repeatCount = 0;
        lastSelectedStudents = [];
        
        // 重新初始化学生权重
        initializeStudentWeights();
        
        // 重置名牌
        nameplate.classList.remove('flipping', 'glow');
        nameplateResult.textContent = '?';
        
        updateHistoryList();
        updateStats();
        
        console.log('历史记录已清空');
    }
}