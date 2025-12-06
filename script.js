// 全局变量
let isDrawing = false;
let drawCount = 3; // 默认点名数量
let stepCount = 3; // 默认运算步骤
let activeDrawIndex = 0; // 当前正在计算的点名索引
let drawResults = []; // 存储所有点名结果
let drawInterval;
let calculationSteps = [];
let currentStep = 0;
let history = []; // 历史记录
let remoteConfig = { high: [], no: [] }; // 远程配置，默认空数组

// DOM元素
const drawCountInput = document.getElementById('drawCount');
const stepCountInput = document.getElementById('stepCount');
const currentDrawCountEl = document.getElementById('currentDrawCount');
const multiDrawContainer = document.getElementById('multiDrawContainer');
const calculationDisplayEl = document.getElementById('calculationDisplay');
const calculationStepEl = document.getElementById('calculationStep');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessageEl = document.getElementById('statusMessage');
const progressBarEl = document.getElementById('progressBar');
const progressTextEl = document.getElementById('progressText');
const historyContainer = document.getElementById('historyContainer');
const emptyHistoryMessage = document.getElementById('emptyHistoryMessage');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeToggleBtn = document.getElementById('themeToggle');

// 初始化多点名容器
function initializeMultiDrawContainer() {
    multiDrawContainer.innerHTML = '';
    drawResults = [];
    
    for (let i = 0; i < drawCount; i++) {
        const drawItem = document.createElement('div');
        drawItem.className = 'draw-item';
        drawItem.id = `draw-item-${i}`;
        drawItem.innerHTML = `
            <div class="draw-item-title">
                <span>点名 #${i + 1}</span>
                <span class="draw-item-status">等待中</span>
            </div>
            <div class="draw-item-number">?</div>
            <div class="draw-item-calculation">等待计算...</div>
            <div class="draw-item-result"></div>
        `;
        multiDrawContainer.appendChild(drawItem);
        
        // 初始化结果对象
        drawResults.push({
            id: i,
            initialNumber: 0,
            steps: [],
            finalResult: 0,
            completed: false
        });
    }
}

// 更新配置
function updateConfig() {
    drawCount = parseInt(drawCountInput.value) || 1;
    if (drawCount < 1) drawCount = 1;
    if (drawCount > 10) drawCount = 10;
    
    stepCount = parseInt(stepCountInput.value) || 3;
    if (stepCount < 1) stepCount = 1;
    if (stepCount > 5) stepCount = 5;
    
    currentDrawCountEl.textContent = drawCount;
    drawCountInput.value = drawCount;
    stepCountInput.value = stepCount;
    
    initializeMultiDrawContainer();
    resetAll();
}

// 随机生成1-54之间的数字，考虑远程配置
function getRandomNumber() {
    const numbers = [];
    
    // 基础数字池（1-54）
    for (let i = 1; i <= 54; i++) {
        numbers.push(i);
    }
    
    // 为high数组中的每个数字增加权重（增加出现概率）
    const highWeight = 3; // 每个high数字额外添加3次
    remoteConfig.high.forEach(num => {
        if (num >= 1 && num <= 54) {
            for (let i = 0; i < highWeight; i++) {
                numbers.push(num);
            }
        }
    });
    
    // 从加权后的数组中随机选择
    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers[randomIndex];
}

// 生成随机运算
function generateRandomCalculation(baseNumber) {
    const operators = ['+', '-', '×', '÷'];
    let operator = operators[Math.floor(Math.random() * operators.length)];
    
    let operand, result;
    
    switch (operator) {
        case '+':
            operand = Math.floor(Math.random() * 20) + 1;
            result = baseNumber + operand;
            break;
        case '-':
            operand = Math.floor(Math.random() * Math.min(baseNumber - 1, 20)) + 1;
            result = baseNumber - operand;
            break;
        case '×':
            operand = Math.floor(Math.random() * 5) + 1;
            result = baseNumber * operand;
            break;
        case '÷':
            // 确保除法能整除
            let divisors = [];
            for (let i = 2; i <= Math.min(baseNumber, 10); i++) {
                if (baseNumber % i === 0) divisors.push(i);
            }
        
            if (divisors.length > 0) {
                operand = divisors[Math.floor(Math.random() * divisors.length)];
                result = baseNumber / operand;
            } else {
                // 如果不能整除，改为加法
                operand = Math.floor(Math.random() * 20) + 1;
                result = baseNumber + operand;
                operator = '+';
            }
            break;
    }
    
    // 确保结果在1-54之间
    while (result > 54 || result < 1) {
        // 重新生成运算而不是递归调用
        let newOperator = operators[Math.floor(Math.random() * operators.length)];
        let newOperand, newResult;
        
        switch (newOperator) {
            case '+':
                newOperand = Math.floor(Math.random() * 20) + 1;
                newResult = baseNumber + newOperand;
                break;
            case '-':
                newOperand = Math.floor(Math.random() * Math.min(baseNumber - 1, 20)) + 1;
                newResult = baseNumber - newOperand;
                break;
            case '×':
                newOperand = Math.floor(Math.random() * 5) + 1;
                newResult = baseNumber * newOperand;
                break;
            case '÷':
                // 确保除法能整除
                let divisors = [];
                for (let i = 2; i <= Math.min(baseNumber, 10); i++) {
                    if (baseNumber % i === 0) divisors.push(i);
                }
                
                if (divisors.length > 0) {
                    newOperand = divisors[Math.floor(Math.random() * divisors.length)];
                    newResult = baseNumber / newOperand;
                } else {
                    // 如果不能整除，改为加法
                    newOperand = Math.floor(Math.random() * 20) + 1;
                    newResult = baseNumber + newOperand;
                    newOperator = '+';
                }
                break;
        }
        
        operator = newOperator;
        operand = newOperand;
        result = newResult;
    }
    
    return {
        base: baseNumber,
        operator: operator,
        operand: operand,
        result: Math.floor(result),
        equation: `${baseNumber} ${operator} ${operand} = ${Math.floor(result)}`
    };
}

// 开始点名过程
function startDrawAnimation() {
    if (isDrawing) return;
    
    isDrawing = true;
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 点名中...';
    statusMessageEl.textContent = `开始点名 (${drawCount}个并行)...`;
    
    // 重置进度
    activeDrawIndex = 0;
    currentStep = 0;
    
    // 确保drawResults数组与当前drawCount匹配
    drawResults = [];
    for (let i = 0; i < drawCount; i++) {
        drawResults.push({
            initialNumber: 0,
            steps: [],
            finalResult: 0,
            completed: false
        });
    }
    
    updateProgress();
    
    // 开始第一个点名
    startSingleDraw(activeDrawIndex);
}

// 开始单个点名
function startSingleDraw(drawIndex) {
    // 激活当前点名项
    activateDrawItem(drawIndex);
    
    // 第一步：随机抽取初始数字
    const initialNumber = getRandomNumber();
    
    // 显示初始数字抽取动画
    let animationCount = 0;
    const maxAnimationCount = 40; // 增加动画帧数，减慢速度
    
    const drawItemNumberEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-number`);
    const drawItemCalcEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-calculation`);
    const drawItemStatusEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-status`);
    
    drawItemStatusEl.textContent = '抽取中...';
    drawItemStatusEl.style.color = '#ffcc00';
    
    drawInterval = setInterval(() => {
        // 生成随机数字用于动画效果
        const randomNum = getRandomNumber();
        
        // 只更新数字，不频繁添加/移除CSS类
        drawItemNumberEl.textContent = randomNum;
        
        animationCount++;
        
        // 动画结束后确定初始数字
        if (animationCount >= maxAnimationCount) {
            clearInterval(drawInterval);
            
            // 更新结果对象
            drawResults[drawIndex].initialNumber = initialNumber;
            
            // 显示最终初始数字
            drawItemNumberEl.textContent = initialNumber;
            
            // 使用setTimeout延迟添加高亮动画，避免与数字更新冲突
            setTimeout(() => {
                drawItemNumberEl.classList.add('highlight-animation');
            }, 0);
            
            // 显示初始数字信息
            drawItemCalcEl.textContent = `初始数字: ${initialNumber}`;
            
            statusMessageEl.textContent = `点名 #${drawIndex + 1}: 开始进行随机运算...`;
            
            // 开始运算步骤
            setTimeout(() => {
                startCalculationSteps(drawIndex);
            }, 300); // 减少延迟时间，加快速度
        }
    }, 40); // 调整间隔，平衡流畅度和性能
}

// 开始计算步骤
function startCalculationSteps(drawIndex) {
    const drawItem = drawResults[drawIndex];
    const drawItemNumberEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-number`);
    const drawItemCalcEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-calculation`);
    const drawItemStatusEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-status`);
    
    // 重置当前步骤
    currentStep = 0;
    calculationSteps = [];
    
    // 执行运算步骤
    function executeStep() {
        if (currentStep >= stepCount) {
            // 所有步骤完成
            drawItem.finalResult = drawItem.initialNumber;
            
            // 计算最终结果（应用所有运算）
            for (const step of drawItem.steps) {
                drawItem.finalResult = step.result;
            }
            
            // 检查结果是否在no数组中，如果是则重新开始这个点名
            if (remoteConfig.no.includes(drawItem.finalResult)) {
                console.log(`结果 ${drawItem.finalResult} 在排除列表中，重新抽取`);
                drawItem.steps = [];
                currentStep = 0;
                
                // 重新生成初始数字
                const newInitialNumber = getRandomNumber();
                drawItem.initialNumber = newInitialNumber;
                drawItemNumberEl.textContent = newInitialNumber;
                drawItemCalcEl.textContent = `初始数字: ${newInitialNumber}`;
                
                // 延迟后重新开始计算
                setTimeout(() => {
                    executeStep();
                }, 200);
                return;
            }
            
            // 结果有效，标记完成
            drawItem.completed = true;
            
            // 更新显示
            const drawItemResultEl = document.querySelector(`#draw-item-${drawIndex} .draw-item-result`);
            drawItemResultEl.textContent = `结果: ${drawItem.finalResult}号`;
            drawItemResultEl.style.color = '#4cd964';
            
            drawItemStatusEl.textContent = '已完成';
            drawItemStatusEl.style.color = '#4cd964';
            
            drawItemNumberEl.textContent = drawItem.finalResult;
            drawItemNumberEl.classList.add('highlight-animation');
            
            statusMessageEl.textContent = `点名 #${drawIndex + 1} 完成! 结果: ${drawItem.finalResult}号`;
            
            // 更新进度
            updateProgress();
            
            // 检查是否所有点名都完成
            const allCompleted = drawResults.every(item => item.completed);
            if (allCompleted) {
                // 所有点名完成，添加到历史记录
                addToHistory();
                
                // 结束点名过程
                setTimeout(() => {
                    endDrawing();
                }, 1000);
            } else {
                // 开始下一个点名
                setTimeout(() => {
                    activeDrawIndex++;
                    if (activeDrawIndex < drawCount) {
                        startSingleDraw(activeDrawIndex);
                    }
                }, 800);
            }
            
            return;
        }
        
        // 生成随机运算
        const currentNumber = currentStep === 0 ? drawItem.initialNumber : drawItem.steps[currentStep - 1].result;
        const calculation = generateRandomCalculation(currentNumber);
        
        // 保存运算步骤
        drawItem.steps.push(calculation);
        
        // 显示运算过程
        drawItemCalcEl.textContent = `步骤 ${currentStep + 1}: ${calculation.equation}`;
        drawItemCalcEl.classList.add('highlight-animation'); // 为算式添加高亮动画
        drawItemNumberEl.textContent = calculation.result;
        drawItemNumberEl.classList.add('highlight-animation');
        
        drawItemStatusEl.textContent = `计算中 (${currentStep + 1}/${stepCount})`;
        drawItemStatusEl.style.color = '#ff8a00';
        
        // 更新主显示区域
        calculationDisplayEl.innerHTML = `
            <span style="font-size: 2rem; color: #ffcc00">点名 #${drawIndex + 1}</span>
            <span style="margin: 0 10px">→</span>
            <span class="equation-animation" style="font-size: 1.8rem">${calculation.equation}</span>
        `;
        
        calculationStepEl.textContent = `点名 #${drawIndex + 1} 第${currentStep + 1}步运算`;
        
        // 更新进度
        currentStep++;
        updateProgress();
        
        // 继续下一步
        setTimeout(() => {
            drawItemNumberEl.classList.remove('highlight-animation');
            drawItemCalcEl.classList.remove('highlight-animation'); // 移除算式高亮动画
            executeStep();
        }, 1200); // 增加延迟时间，减慢计算速度
    }
    
    // 开始执行第一步
    executeStep();
}

// 激活点名项
function activateDrawItem(drawIndex) {
    // 移除所有激活状态
    document.querySelectorAll('.draw-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 激活当前点名项
    const currentDrawItem = document.getElementById(`draw-item-${drawIndex}`);
    if (currentDrawItem) {
        currentDrawItem.classList.add('active');
    }
}

// 更新进度
function updateProgress() {
    // 计算总体进度
    let completedSteps = 0;
    let totalSteps = drawCount * stepCount;
    
    for (const draw of drawResults) {
        completedSteps += draw.steps.length;
        if (draw.completed) {
            completedSteps += (stepCount - draw.steps.length);
        }
    }
    
    const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    progressBarEl.style.width = `${progressPercent}%`;
    progressTextEl.textContent = `${completedSteps}/${totalSteps}`;
}

// 添加到历史记录
function addToHistory() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const historyItem = {
        id: history.length + 1,
        time: timeStr,
        drawCount: drawCount,
        results: drawResults.map(draw => ({
            finalResult: draw.finalResult,
            steps: draw.steps
        }))
    };
    
    history.unshift(historyItem); // 添加到开头
    
    // 只保留最近10条记录
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    updateHistoryDisplay();
}

// 更新历史记录显示
function updateHistoryDisplay() {
    historyContainer.innerHTML = '';
    
    if (history.length === 0) {
        emptyHistoryMessage.style.display = 'block';
        return;
    }
    
    emptyHistoryMessage.style.display = 'none';
    
    history.forEach(item => {
        const historyItemEl = document.createElement('div');
        historyItemEl.className = 'history-item';
        
        // 生成运算公式字符串
        let equations = '';
        item.results.forEach((result, index) => {
            if (result.steps.length > 0) {
                const stepsStr = result.steps.map(step => step.equation).join(' → ');
                equations += `点名${index + 1}: ${stepsStr}<br>`;
            }
        });
        
        historyItemEl.innerHTML = `
            <div class="history-item-header">
                <span>点名批次 #${item.id}</span>
                <span class="history-item-time">${item.time}</span>
            </div>
            <div class="history-item-numbers">
                ${item.results.map((result, index) => `
                    <div class="history-number">
                        <i class="fas fa-user"></i>
                        点名${index + 1}: ${result.finalResult}号
                    </div>
                `).join('')}
            </div>
            <div class="history-item-equation">
                ${equations}
            </div>
        `;
        
        historyContainer.appendChild(historyItemEl);
    });
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
        history = [];
        updateHistoryDisplay();
    }
}

// 结束点名
function endDrawing() {
    isDrawing = false;
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> 开始点名';
    
    statusMessageEl.textContent = `点名完成! 共完成 ${drawCount} 个点名`;
    statusMessageEl.style.color = '#4cd964';
    
    // 移除所有激活状态
    document.querySelectorAll('.draw-item').forEach(item => {
        item.classList.remove('active');
    });
}

// 重置所有数据
function resetAll() {
    clearInterval(drawInterval);
    
    isDrawing = false;
    activeDrawIndex = 0;
    
    // 确保drawResults数组与当前drawCount匹配
    drawResults = [];
    for (let i = 0; i < drawCount; i++) {
        drawResults.push({
            initialNumber: 0,
            steps: [],
            finalResult: 0,
            completed: false
        });
    }
    
    calculationSteps = [];
    currentStep = 0;
    
    calculationDisplayEl.textContent = '点击开始按钮进行随机抽取';
    calculationStepEl.textContent = '';
    
    statusMessageEl.textContent = '准备就绪，点击开始按钮';
    statusMessageEl.style.color = '#a3a3ff';
    
    progressBarEl.style.width = '0%';
    progressTextEl.textContent = '0/0';
    
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> 开始点名';
    
    initializeMultiDrawContainer();
}

// 主题切换功能
function toggleTheme() {
    const body = document.body;
    const isDark = !body.classList.contains('light-theme');
    
    if (isDark) {
        body.classList.add('light-theme');
        themeToggleBtn.classList.remove('dark');
        themeToggleBtn.classList.add('light');
        themeToggleBtn.innerHTML = '<i class="fas"></i> 深色主题';
    } else {
        body.classList.remove('light-theme');
        themeToggleBtn.classList.remove('light');
        themeToggleBtn.classList.add('dark');
        themeToggleBtn.innerHTML = '<i class="fas"></i> 浅色主题';
    }
    
    // 保存主题设置到localStorage
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// 获取远程配置
async function fetchRemoteConfig() {
    const configStatus = document.getElementById('configStatus');
    
    try {
        const response = await fetch('https://d.nextzerostudio.cn/d/Config/config.json');
        if (response.ok) {
            const config = await response.json();
            // 验证配置格式
            if (Array.isArray(config.high)) {
                remoteConfig.high = config.high.filter(item => typeof item === 'number');
            }
            if (Array.isArray(config.no)) {
                remoteConfig.no = config.no.filter(item => typeof item === 'number');
            }
            console.log('远程配置加载成功:', remoteConfig);
            
            // 更新状态图标为成功
            configStatus.className = 'config-status success';
        } else {
            // 响应不OK
            configStatus.className = 'config-status error';
        }
    } catch (error) {
        console.error('加载远程配置失败:', error);
        // 使用默认配置
        remoteConfig = { high: [], no: [] };
        
        // 更新状态图标为失败
        configStatus.className = 'config-status error';
    }
}

// 初始化主题
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        themeToggleBtn.classList.remove('dark');
        themeToggleBtn.classList.add('light');
        themeToggleBtn.innerHTML = '<i class="fas"></i> 深色主题';
    } else {
        body.classList.remove('light-theme');
        themeToggleBtn.classList.remove('light');
        themeToggleBtn.classList.add('dark');
        themeToggleBtn.innerHTML = '<i class="fas"></i> 浅色主题';
    }
}

// 事件监听
startBtn.addEventListener('click', startDrawAnimation);
resetBtn.addEventListener('click', resetAll);
clearHistoryBtn.addEventListener('click', clearHistory);
themeToggleBtn.addEventListener('click', toggleTheme);

// 配置变更监听
drawCountInput.addEventListener('change', updateConfig);
stepCountInput.addEventListener('change', updateConfig);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
    updateConfig();
    updateHistoryDisplay();
    initializeTheme();
    
    // 加载远程配置
    await fetchRemoteConfig();
    
    // 定期更新配置（每30秒）
    setInterval(fetchRemoteConfig, 30000);
});