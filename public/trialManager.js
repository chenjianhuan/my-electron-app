// 试用期管理模块
class TrialManager {
    constructor() {
        this.installDateKey = 'installDate';
        this.lastRunDateKey = 'lastRunDate';
        this.expirationDays = 14; // 试用期14天
        this.currentDate = new Date();
        this.trialEnabled = true; // 开启试用期限制
        // this.isDevelopment = this.checkDevelopmentMode(); // 已废弃自动重置逻辑
    }

    // 检查是否为开发模式（已废弃自动重置逻辑）
    // checkDevelopmentMode() {
    //     return !window.location.href.includes('asar') || 
    //            window.location.href.includes('file://') ||
    //            window.location.href.includes('localhost');
    // }

    checkTrialExpiration() {
        if (!this.trialEnabled) {
            return true;
        }

        // 已废弃自动重置逻辑
        // if (this.isDevelopment) {
        //     console.log('开发模式：自动重置试用期');
        //     this.resetTrial();
        //     return true;
        // }

        let installDate = localStorage.getItem(this.installDateKey);
        let lastRunDate = localStorage.getItem(this.lastRunDateKey);

        console.log('首次安装日期:', installDate);
        console.log('上次运行日期:', lastRunDate);

        // 首次运行，记录安装日期
        if (!installDate) {
            installDate = this.currentDate.toISOString();
            localStorage.setItem(this.installDateKey, installDate);
            console.log('首次运行，记录安装日期:', installDate);
        }

        // 检查系统时间是否被篡改
        if (lastRunDate) {
            const savedLastRunDate = new Date(lastRunDate);
            if (this.currentDate < savedLastRunDate) {
                this.showError('检测到系统时间异常，软件功能已禁用。');
                this.disableSoftware();
                return false;
            }
        }

        // 更新最后运行时间
        localStorage.setItem(this.lastRunDateKey, this.currentDate.toISOString());

        // 检查试用期
        const savedInstallDate = new Date(installDate);
        const timeDiff = this.currentDate.getTime() - savedInstallDate.getTime();
        const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        if (dayDiff > this.expirationDays) {
            this.showError('您的试用期已过，软件功能已禁用。');
            this.disableSoftware();
            return false;
        } else {
            const remainingDays = Math.floor(this.expirationDays - dayDiff);
            console.log(`软件正常运行，已使用 ${Math.floor(dayDiff)} 天，剩余 ${remainingDays} 天。`);
            
            // 显示剩余试用期提醒
            if (remainingDays <= 3) {
                this.showTrialWarning(remainingDays);
            }
            return true;
        }
    }

    showError(message) {
        alert(message);
    }

    showTrialWarning(remainingDays) {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
        `;
        warningDiv.innerHTML = `
            <h4>试用期提醒</h4>
            <p>您的试用期还剩 ${remainingDays} 天</p>
            <button onclick="this.parentElement.remove()" style="background: white; color: #ff6b6b; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">关闭</button>
        `;
        document.body.appendChild(warningDiv);
        
        // 5秒后自动消失
        setTimeout(() => {
            if (warningDiv.parentElement) {
                warningDiv.remove();
            }
        }, 5000);
    }

    disableSoftware() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = true;
        });

        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; background: #f8f9fa;">
                <h1 style="color: #dc3545; margin-bottom: 20px;">试用期已过</h1>
                <p style="color: #6c757d; font-size: 18px;">软件功能已禁用，请联系开发者获取完整版本。</p>
            </div>
        `;
    }

    // 获取剩余试用天数
    getRemainingDays() {
        if (!this.trialEnabled) return Number.POSITIVE_INFINITY;
        const installDate = localStorage.getItem(this.installDateKey);
        if (!installDate) return this.expirationDays;
        
        const savedInstallDate = new Date(installDate);
        const timeDiff = this.currentDate.getTime() - savedInstallDate.getTime();
        const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.floor(this.expirationDays - dayDiff));
    }

    // 重置试用期（仅用于开发测试）
    resetTrial() {
        localStorage.removeItem(this.installDateKey);
        localStorage.removeItem(this.lastRunDateKey);
        console.log('试用期已重置');
        
        // 刷新页面以重新初始化
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// 创建试用期管理器实例
const trialManager = new TrialManager();
if (typeof window !== 'undefined') {
    window.trialManager = trialManager;
}

// 检查试用期
function checkTrialExpiration() {
    return trialManager.checkTrialExpiration();
}

// 获取剩余天数
function getRemainingDays() {
    return trialManager.getRemainingDays();
}

// 延迟初始化试用期检查，确保页面完全加载
setTimeout(() => {
    checkTrialExpiration();
}, 100);
