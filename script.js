// 全局变量 - 每次重新初始化
let history = [];
let generateCount = 0;
let totalSum = 0;
let uniqueStudents = new Set();
let repeatCount = 0;

// 概率设置（从远程JSON文件加载）
let probabilitySettings = {
    highProbabilityStudents: [],
    lowProbabilityStudents: [],
    highProbability: 0,
    lowProbability: 0
};

// 配置文件URL
const CONFIG_URL = 'https://d.nextzerostudio.cn/d/Config/config.json';

// DOM 元素
const generateBtn = document.getElementById('generateBtn');
const currentResult = document.getElementById('currentResult');
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('页面加载完成，开始初始化...');
    
    // 显示加载状态图标
    showLoadingIcon();
    
    // 加载配置文件
    await loadConfig();
    
    // 初始化学生权重
    initializeStudentWeights();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 更新统计信息
    updateStats();
    
    console.log('初始化完成 - 新会话开始');
});

// 初始化学生权重
function initializeStudentWeights() {
    // 重置权重
    studentWeights = {};
    
    // 为所有学生设置基础权重
    for (let i = 1; i <= 53; i++) {
        studentWeights[i] = 1.0; // 基础权重
    }
    
    // 为特殊学生设置初始权重
    probabilitySettings.highProbabilityStudents.forEach(num => {
        if (num >= 1 && num <= 53) {
            studentWeights[num] = 2.0; // 高概率学生权重
        }
    });
    
    probabilitySettings.lowProbabilityStudents.forEach(num => {
        if (num >= 1 && num <= 53) {
            studentWeights[num] = 0.1; // 低概率学生权重
        }
    });
    
    console.log('学生权重初始化完成:', studentWeights);
}

// 更新学生权重（基于历史记录）
function updateStudentWeights(selectedNumbers) {
    // 降低最近被点名的学生的权重
    lastSelectedStudents.forEach(num => {
        if (studentWeights[num] > 0.1) {
            studentWeights[num] = Math.max(0.1, studentWeights[num] * 0.3); // 大幅降低权重
        }
    });
    
    // 更新最近选择的学生列表
    lastSelectedStudents = [...selectedNumbers];
    
    // 逐步恢复未点名学生的权重
    for (let i = 1; i <= 53; i++) {
        if (!lastSelectedStudents.includes(i)) {
            // 如果是特殊学生，恢复到特殊权重，否则恢复到基础权重
            if (probabilitySettings.highProbabilityStudents.includes(i)) {
                studentWeights[i] = Math.min(2.0, studentWeights[i] + 0.1);
            } else if (probabilitySettings.lowProbabilityStudents.includes(i)) {
                studentWeights[i] = Math.min(0.1, studentWeights[i] + 0.01);
            } else {
                studentWeights[i] = Math.min(1.0, studentWeights[i] + 0.05);
            }
        }
    }
    
    console.log('学生权重已更新:', studentWeights);
}

// 显示加载状态图标
function showLoadingIcon() {
    const rangeDisplay = document.querySelector('.range-display');
    if (rangeDisplay) {
        const statusIcon = document.createElement('div');
        statusIcon.id = 'configStatusIcon';
        statusIcon.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff9966;
            animation: pulse 1.5s infinite;
        `;
        rangeDisplay.style.position = 'relative';
        rangeDisplay.appendChild(statusIcon);
        
        // 添加脉冲动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 更新状态图标
function updateStatusIcon(success) {
    const statusIcon = document.getElementById('configStatusIcon');
    if (statusIcon) {
        if (success) {
            statusIcon.style.background = '#4ecdc4';
            statusIcon.style.animation = 'none';
            statusIcon.title = '配置文件加载成功';
        } else {
            statusIcon.style.background = '#ff6b6b';
            statusIcon.style.animation = 'none';
            statusIcon.title = '配置文件加载失败，使用默认配置';
        }
    }
}

// 从远程JSON文件加载配置
async function loadConfig() {
    try {
        console.log('开始从远程加载配置文件...');
        console.log('配置文件URL:', CONFIG_URL);
        
        const response = await fetch(CONFIG_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const config = await response.json();
        
        // 验证配置数据
        if (config.highProbabilityStudents !== undefined && config.lowProbabilityStudents !== undefined) {
            probabilitySettings = {
                highProbabilityStudents: Array.isArray(config.highProbabilityStudents) ? config.highProbabilityStudents : [],
                lowProbabilityStudents: Array.isArray(config.lowProbabilityStudents) ? config.lowProbabilityStudents : [],
                highProbability: typeof config.highProbability === 'number' ? config.highProbability : 1,
                lowProbability: typeof config.lowProbability === 'number' ? config.lowProbability : 0.000000000000000001
            };
            
            console.log('远程配置文件加载成功:', probabilitySettings);
            
            // 更新状态图标为成功
            updateStatusIcon(true);
        } else {
            throw new Error('配置文件格式错误');
        }
    } catch (error) {
        console.error('加载远程配置文件失败:', error);
        
        // 使用默认配置
        probabilitySettings = {
            highProbabilityStudents: [4, 29],
            lowProbabilityStudents: [12, 34],
            highProbability: 1,
            lowProbability: 0.000000000000000001
        };
        
        console.log('使用默认配置:', probabilitySettings);
        
        // 更新状态图标为失败
        updateStatusIcon(false);
    }
}

// 设置事件监听器
function setupEventListeners() {
    console.log('设置事件监听器');
    
    generateBtn.addEventListener('click', function() {
        console.log('点击了生成按钮');
        generateRandomNumbers();
    });
    
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // 添加输入框验证
    countInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        if (value < 1) this.value = 1;
        if (value > 10) this.value = 10;
    });
}

// 优化的随机数生成算法
function generateRandomNumber() {
    // 创建权重数组
    const weights = [];
    const numbers = [];
    
    for (let i = 1; i <= 53; i++) {
        numbers.push(i);
        weights.push(studentWeights[i] || 1.0);
    }
    
    // 使用加权随机选择算法
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < numbers.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            const selectedNumber = numbers[i];
            console.log(`选中学号: ${selectedNumber}, 权重: ${weights[i]}`);
            return selectedNumber;
        }
    }
    
    // 如果上述方法失败，使用均匀分布作为后备
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
}

// 生成随机数
function generateRandomNumbers() {
    console.log('开始生成随机数');
    
    const count = parseInt(countInput.value) || 1;
    console.log(`生成个数: ${count}`);
    
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

// 显示结果
function displayResults(results) {
    console.log('显示结果:', results);
    
    if (results.length === 1) {
        currentResult.textContent = results[0];
        currentResult.classList.remove('flip');
        void currentResult.offsetWidth; // 触发重绘
        currentResult.classList.add('flip');
        batchResults.innerHTML = '';
        
        // 如果是特殊数字，添加发光效果
        if (probabilitySettings.highProbabilityStudents.includes(results[0]) || 
            probabilitySettings.lowProbabilityStudents.includes(results[0])) {
            currentResult.classList.add('glow');
            console.log(`特殊学号 ${results[0]} 添加发光效果`);
        } else {
            currentResult.classList.remove('glow');
        }
    } else {
        currentResult.textContent = '多点名结果';
        batchResults.innerHTML = '';
        
        results.forEach(num => {
            const numberElement = document.createElement('div');
            numberElement.className = 'batch-number';
            numberElement.textContent = num;
            batchResults.appendChild(numberElement);
        });
        
        currentResult.classList.remove('glow');
    }
}

// 添加到历史记录
function addToHistory(results) {
    const timestamp = new Date().toLocaleTimeString();
    
    // 检查是否有重复点名
    let hasRepeat = false;
    results.forEach(num => {
        if (uniqueStudents.has(num)) {
            hasRepeat = true;
            repeatCount++;
            console.log(`学号 ${num} 重复点名`);
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
    
    console.log(`统计更新: 点名次数=${generateCount}, 已点人数=${uniqueStudents.size}, 重复次数=${repeatCount}`);
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
        
        updateHistoryList();
        updateStats();
        
        console.log('历史记录已清空，学生权重已重置');
    }
}