// 洛伦兹吸引子可视化应用
class LorenzAttractorVisualization {
    constructor() {
        // 系统参数 - 经典混沌参数
        this.sigma = 10;     // σ - 普朗特数
        this.rho = 28;       // ρ - 瑞利数
        this.beta = 8/3;     // β - 几何参数
        
        // 时间步长
        this.dt = 0.01;
        
        // 粒子状态
        this.particles = [];
        this.trails = [];
        this.trailMaterials = [];
        
        // 运行状态
        this.isRunning = false;
        this.animationId = null;
        
        // 场景元素
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.axisHelper = null;
        
        // 初始化
        this.init();
        this.createWarningOverlay();
        this.setupEventListeners();
        this.animate();
    }
    
    // 检测数值是否有效（不是NaN或Infinity）
    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
    
    // 检测粒子位置是否有效
    isParticlePositionValid(particle) {
        return this.isValidNumber(particle.position.x) &&
               this.isValidNumber(particle.position.y) &&
               this.isValidNumber(particle.position.z);
    }
    
    // 创建警告覆盖层
    createWarningOverlay() {
        const container = document.getElementById('canvas-container');
        
        // 创建警告元素
        const warningOverlay = document.createElement('div');
        warningOverlay.id = 'warning-overlay';
        warningOverlay.className = 'warning-overlay';
        warningOverlay.innerHTML = `
            <div class="warning-content">
                <div class="warning-icon">⚠️</div>
                <h3 class="warning-title">数值异常警告</h3>
                <p class="warning-message" id="warning-message"></p>
                <button class="warning-close-btn" id="warning-close-btn">确定</button>
            </div>
        `;
        warningOverlay.style.display = 'none';
        container.appendChild(warningOverlay);
        
        // 添加关闭按钮事件
        document.getElementById('warning-close-btn').addEventListener('click', () => {
            this.hideWarning();
        });
    }
    
    // 显示警告
    showWarning(message) {
        const overlay = document.getElementById('warning-overlay');
        const messageElement = document.getElementById('warning-message');
        
        messageElement.textContent = message;
        overlay.style.display = 'flex';
        
        // 添加aria属性以支持无障碍
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'warning-title');
        overlay.focus();
    }
    
    // 隐藏警告
    hideWarning() {
        const overlay = document.getElementById('warning-overlay');
        overlay.style.display = 'none';
        overlay.removeAttribute('role');
        overlay.removeAttribute('aria-modal');
        overlay.removeAttribute('aria-labelledby');
    }
    
    // 处理数值异常
    handleNumericalError(particle) {
        this.pauseSimulation();
        
        const warningMessage = `检测到数值异常！
粒子 "${particle.name}" 的坐标出现无效值（NaN 或 Infinity）。
这可能是由于参数设置不当导致的。
建议：
- 减小时间步长（dt）
- 检查参数设置是否在合理范围内
- 当前参数：σ=${this.sigma.toFixed(2)}, ρ=${this.rho.toFixed(2)}, β=${this.beta.toFixed(3)}

模拟已自动暂停，请重置后使用更安全的参数。`;

        this.showWarning(warningMessage);
        console.error('Numerical error detected for particle:', particle.name);
        console.error('Current position:', particle.position);
    }
    
    // 初始化Three.js场景
    init() {
        // 获取容器
        const container = document.getElementById('canvas-container');
        
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        // 创建相机
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(50, 30, 80);
        this.camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        
        // 添加轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI;
        
        // 添加坐标轴辅助
        this.axisHelper = new THREE.AxesHelper(30);
        this.scene.add(this.axisHelper);
        
        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // 添加点光源
        const pointLight1 = new THREE.PointLight(0x4a9eff, 1, 200);
        pointLight1.position.set(50, 50, 50);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x10b981, 0.8, 200);
        pointLight2.position.set(-50, -50, 50);
        this.scene.add(pointLight2);
        
        // 添加网格地面
        const gridHelper = new THREE.GridHelper(100, 20, 0x333333, 0x222222);
        gridHelper.position.y = -30;
        this.scene.add(gridHelper);
        
        // 窗口大小调整
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    // 创建粒子
    createParticle(initialX, initialY, initialZ, color, name) {
        // 创建几何体
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(initialX, initialY, initialZ);
        sphere.castShadow = true;
        
        // 添加发光效果
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sphere.add(glow);
        
        // 添加到场景
        this.scene.add(sphere);
        
        // 创建轨迹
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });
        
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);
        this.trails.push(trail);
        this.trailMaterials.push(trailMaterial);
        
        // 返回粒子对象
        return {
            mesh: sphere,
            trail: trail,
            trailPoints: [],
            position: { x: initialX, y: initialY, z: initialZ },
            name: name,
            color: color
        };
    }
    
    // 洛伦兹方程计算下一步
    calculateNextStep(particle) {
        const { x, y, z } = particle.position;
        
        // 首先检查当前位置是否有效
        if (!this.isParticlePositionValid(particle)) {
            this.handleNumericalError(particle);
            return false;
        }
        
        // 洛伦兹微分方程
        // dx/dt = σ(y - x)
        // dy/dt = x(ρ - z) - y
        // dz/dt = xy - βz
        
        const dx = this.sigma * (y - x) * this.dt;
        const dy = (x * (this.rho - z) - y) * this.dt;
        const dz = (x * y - this.beta * z) * this.dt;
        
        // 检查计算出的增量是否有效
        if (!this.isValidNumber(dx) || !this.isValidNumber(dy) || !this.isValidNumber(dz)) {
            this.handleNumericalError(particle);
            return false;
        }
        
        // 更新位置
        particle.position.x += dx;
        particle.position.y += dy;
        particle.position.z += dz;
        
        // 再次检查更新后的位置是否有效
        if (!this.isParticlePositionValid(particle)) {
            this.handleNumericalError(particle);
            return false;
        }
        
        // 额外的边界检查 - 防止坐标过大
        const maxPosition = 1000;
        if (Math.abs(particle.position.x) > maxPosition ||
            Math.abs(particle.position.y) > maxPosition ||
            Math.abs(particle.position.z) > maxPosition) {
            this.handleNumericalError(particle);
            return false;
        }
        
        // 更新网格位置
        particle.mesh.position.set(
            particle.position.x,
            particle.position.y,
            particle.position.z
        );
        
        // 添加轨迹点
        particle.trailPoints.push(new THREE.Vector3(
            particle.position.x,
            particle.position.y,
            particle.position.z
        ));
        
        // 限制轨迹点数量，防止性能问题
        const maxTrailLength = 5000;
        if (particle.trailPoints.length > maxTrailLength) {
            particle.trailPoints.shift();
        }
        
        // 更新轨迹几何体
        this.updateTrail(particle);
        
        return true;
    }
    
    // 更新轨迹
    updateTrail(particle) {
        const positions = new Float32Array(particle.trailPoints.length * 3);
        
        for (let i = 0; i < particle.trailPoints.length; i++) {
            positions[i * 3] = particle.trailPoints[i].x;
            positions[i * 3 + 1] = particle.trailPoints[i].y;
            positions[i * 3 + 2] = particle.trailPoints[i].z;
        }
        
        particle.trail.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        );
        particle.trail.geometry.setDrawRange(0, particle.trailPoints.length);
        particle.trail.geometry.needsUpdate = true;
    }
    
    // 开始模拟
    startSimulation() {
        if (this.isRunning) return;
        
        // 如果没有粒子，创建一个
        if (this.particles.length === 0) {
            this.createDefaultParticle();
        }
        
        this.isRunning = true;
        document.getElementById('start-btn').textContent = '暂停模拟';
        document.getElementById('start-btn').classList.add('running');
    }
    
    // 暂停模拟
    pauseSimulation() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        document.getElementById('start-btn').textContent = '继续模拟';
        document.getElementById('start-btn').classList.remove('running');
    }
    
    // 切换开始/暂停
    toggleSimulation() {
        if (this.isRunning) {
            this.pauseSimulation();
        } else {
            this.startSimulation();
        }
    }
    
    // 创建默认粒子
    createDefaultParticle() {
        // 蓝色粒子 (0, 1, 0)
        const particle = this.createParticle(0, 1, 0, 0x60a5fa, '粒子 A');
        this.particles.push(particle);
    }
    
    // 蝴蝶效应演示 - 创建两个初始位置非常接近的粒子
    startButterflyEffect() {
        // 清除现有粒子
        this.clearTrails();
        
        // 微小差异 0.00001
        const epsilon = 0.00001;
        
        // 粒子A (蓝色) - 初始位置 (0, 1, 0)
        const particleA = this.createParticle(0, 1, 0, 0x60a5fa, '粒子 A');
        
        // 粒子B (红色) - 初始位置 (0.00001, 1, 0) - 只有微小差异
        const particleB = this.createParticle(epsilon, 1, 0, 0xf87171, '粒子 B');
        
        this.particles = [particleA, particleB];
        
        // 开始模拟
        if (!this.isRunning) {
            this.startSimulation();
        }
    }
    
    // 清除轨迹
    clearTrails() {
        // 移除所有粒子和轨迹
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            this.scene.remove(particle.trail);
        });
        
        this.particles = [];
        this.trails = [];
        this.trailMaterials = [];
        
        // 重置坐标显示
        this.updateCoordinates();
    }
    
    // 重置到初始状态
    reset() {
        this.pauseSimulation();
        this.clearTrails();
        
        // 重置按钮文本
        document.getElementById('start-btn').textContent = '开始模拟';
        document.getElementById('start-btn').classList.remove('running');
        
        // 重置参数到默认值
        this.sigma = 10;
        this.rho = 28;
        this.beta = 8/3;
        
        // 更新滑块值
        document.getElementById('sigma').value = 10;
        document.getElementById('rho').value = 28;
        document.getElementById('beta').value = (8/3).toFixed(3);
        
        // 更新显示值
        document.getElementById('sigma-value').textContent = '10';
        document.getElementById('rho-value').textContent = '28';
        document.getElementById('beta-value').textContent = (8/3).toFixed(3);
        
        // 重置相机位置
        this.camera.position.set(50, 30, 80);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }
    
    // 更新坐标显示
    updateCoordinates() {
        // 粒子A坐标
        if (this.particles[0]) {
            document.getElementById('a-x').textContent = this.particles[0].position.x.toFixed(5);
            document.getElementById('a-y').textContent = this.particles[0].position.y.toFixed(5);
            document.getElementById('a-z').textContent = this.particles[0].position.z.toFixed(5);
        } else {
            document.getElementById('a-x').textContent = '-';
            document.getElementById('a-y').textContent = '-';
            document.getElementById('a-z').textContent = '-';
        }
        
        // 粒子B坐标
        if (this.particles[1]) {
            document.getElementById('b-x').textContent = this.particles[1].position.x.toFixed(5);
            document.getElementById('b-y').textContent = this.particles[1].position.y.toFixed(5);
            document.getElementById('b-z').textContent = this.particles[1].position.z.toFixed(5);
            
            // 计算间距
            const dx = this.particles[0].position.x - this.particles[1].position.x;
            const dy = this.particles[0].position.y - this.particles[1].position.y;
            const dz = this.particles[0].position.z - this.particles[1].position.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            document.getElementById('distance').textContent = distance.toFixed(5);
        } else {
            document.getElementById('b-x').textContent = '-';
            document.getElementById('b-y').textContent = '-';
            document.getElementById('b-z').textContent = '-';
            document.getElementById('distance').textContent = '-';
        }
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 开始/暂停按钮
        document.getElementById('start-btn').addEventListener('click', () => {
            this.toggleSimulation();
        });
        
        // 蝴蝶效应按钮
        document.getElementById('butterfly-btn').addEventListener('click', () => {
            this.startButterflyEffect();
        });
        
        // 清除按钮
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearTrails();
        });
        
        // 重置按钮
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
        
        // Sigma 滑块
        document.getElementById('sigma').addEventListener('input', (e) => {
            this.sigma = parseFloat(e.target.value);
            document.getElementById('sigma-value').textContent = this.sigma.toFixed(1);
        });
        
        // Rho 滑块
        document.getElementById('rho').addEventListener('input', (e) => {
            this.rho = parseFloat(e.target.value);
            document.getElementById('rho-value').textContent = this.rho.toFixed(1);
        });
        
        // Beta 滑块
        document.getElementById('beta').addEventListener('input', (e) => {
            this.beta = parseFloat(e.target.value);
            document.getElementById('beta-value').textContent = this.beta.toFixed(3);
        });
    }
    
    // 窗口大小调整
    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    // 动画循环
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // 更新控制器
        this.controls.update();
        
        // 如果正在运行，更新粒子
        if (this.isRunning) {
            // 每帧多次迭代，让运动更快
            const iterationsPerFrame = 10;
            let hasError = false;
            
            for (let i = 0; i < iterationsPerFrame && !hasError; i++) {
                for (let j = 0; j < this.particles.length && !hasError; j++) {
                    const result = this.calculateNextStep(this.particles[j]);
                    if (result === false) {
                        hasError = true;
                    }
                }
            }
            
            // 如果没有错误，更新坐标显示
            if (!hasError) {
                this.updateCoordinates();
            }
        }
        
        // 渲染
        this.renderer.render(this.scene, this.camera);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 创建加载界面
    const container = document.getElementById('canvas-container');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">初始化洛伦兹吸引子...</div>
        </div>
    `;
    container.appendChild(loadingOverlay);
    
    // 初始化应用
    setTimeout(() => {
        const app = new LorenzAttractorVisualization();
        
        // 移除加载界面
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500);
        }, 500);
        
        // 全局访问
        window.lorenzApp = app;
    }, 100);
});