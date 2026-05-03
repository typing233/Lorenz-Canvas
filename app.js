// 混沌吸引子可视化应用 - 增强版 v2
// 改进：双轨独立过渡系统 - 旧轨迹消隐，新轨迹从旧位置开始显现

class AttractorSystem {
    constructor() {
        this.attractors = this.initAttractors();
        this.currentAttractor = 'lorenz';
    }

    initAttractors() {
        return {
            lorenz: {
                name: '洛伦兹吸引子',
                params: { sigma: 10, rho: 28, beta: 8/3 },
                defaultParams: { sigma: 10, rho: 28, beta: 8/3 },
                paramRanges: { sigma: [0, 30], rho: [0, 50], beta: [0, 10] },
                color: 0x60a5fa,
                equations: (x, y, z, params, dt) => {
                    const dx = params.sigma * (y - x) * dt;
                    const dy = (x * (params.rho - z) - y) * dt;
                    const dz = (x * y - params.beta * z) * dt;
                    return { dx, dy, dz };
                },
                scale: 1,
                description: '经典混沌吸引子，展现蝴蝶效应'
            },
            rossler: {
                name: 'Rössler吸引子',
                params: { a: 0.2, b: 0.2, c: 5.7 },
                defaultParams: { a: 0.2, b: 0.2, c: 5.7 },
                paramRanges: { a: [0, 1], b: [0, 1], c: [0, 20] },
                color: 0xf87171,
                equations: (x, y, z, params, dt) => {
                    const dx = (-y - z) * dt;
                    const dy = (x + params.a * y) * dt;
                    const dz = (params.b + z * (x - params.c)) * dt;
                    return { dx, dy, dz };
                },
                scale: 8,
                description: '带状混沌结构，形似扭曲的丝带'
            },
            chen: {
                name: 'Chen吸引子',
                params: { a: 35, b: 3, c: 28 },
                defaultParams: { a: 35, b: 3, c: 28 },
                paramRanges: { a: [0, 50], b: [0, 10], c: [0, 50] },
                color: 0x34d399,
                equations: (x, y, z, params, dt) => {
                    const dx = params.a * (y - x) * dt;
                    const dy = ((params.c - params.a) * x - x * z + params.c * y) * dt;
                    const dz = (x * y - params.b * z) * dt;
                    return { dx, dy, dz };
                },
                scale: 1,
                description: '与洛伦兹类似但拓扑不同的混沌系统'
            },
            aizawa: {
                name: 'Aizawa吸引子',
                params: { alpha: 0.95, beta: 0.7, gamma: 0.6, epsilon: 3.5, zeta: 0.25, eta: 0.1 },
                defaultParams: { alpha: 0.95, beta: 0.7, gamma: 0.6, epsilon: 3.5, zeta: 0.25, eta: 0.1 },
                paramRanges: { alpha: [0, 2], beta: [0, 2], gamma: [0, 2], epsilon: [0, 10], zeta: [0, 1], eta: [0, 1] },
                color: 0xfbbf24,
                equations: (x, y, z, params, dt) => {
                    const wz = params.gamma + params.zeta * z;
                    const dx = (x * (z - params.beta) - wz * y) * dt;
                    const dy = (x * wz + y * (z - params.beta)) * dt;
                    const dz = (params.eta + params.alpha * z - Math.pow(z, 3) / 3 - 
                               (Math.pow(x, 2) + Math.pow(y, 2)) * (1 + params.epsilon * z) +
                               params.zeta * z * Math.pow(x, 3)) * dt;
                    return { dx, dy, dz };
                },
                scale: 3,
                description: '复杂的三维混沌系统，呈现螺旋状结构'
            }
        };
    }

    getAttractor(name) {
        return this.attractors[name];
    }

    getCurrentAttractor() {
        return this.attractors[this.currentAttractor];
    }

    setAttractor(name) {
        if (this.attractors[name]) {
            this.currentAttractor = name;
            return true;
        }
        return false;
    }
}

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.oldParticles = [];
        this.trailMeshes = [];
        this.maxParticles = 500;
        this.trailLength = 200;
        this.isMultiParticleMode = false;
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 180;
    }

    createParticle(initialX, initialY, initialZ, color, name, randomOffset = 0, initialOpacity = 0.9) {
        const offsetX = (Math.random() - 0.5) * randomOffset;
        const offsetY = (Math.random() - 0.5) * randomOffset;
        const offsetZ = (Math.random() - 0.5) * randomOffset;

        const position = {
            x: initialX + offsetX,
            y: initialY + offsetY,
            z: initialZ + offsetZ
        };

        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: initialOpacity
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        
        this.scene.add(mesh);

        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(this.trailLength * 3);
        const trailColors = new Float32Array(this.trailLength * 3);
        const trailAlphas = new Float32Array(this.trailLength);

        const colorObj = new THREE.Color(color);
        for (let i = 0; i < this.trailLength; i++) {
            trailPositions[i * 3] = position.x;
            trailPositions[i * 3 + 1] = position.y;
            trailPositions[i * 3 + 2] = position.z;
            trailColors[i * 3] = colorObj.r;
            trailColors[i * 3 + 1] = colorObj.g;
            trailColors[i * 3 + 2] = colorObj.b;
            trailAlphas[i] = 0;
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
        trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                globalOpacity: { value: 1.0 }
            },
            vertexShader: `
                attribute float alpha;
                uniform float globalOpacity;
                varying float vAlpha;
                varying vec3 vColor;
                attribute vec3 color;
                
                void main() {
                    vAlpha = alpha * globalOpacity;
                    vColor = color;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                varying vec3 vColor;
                
                void main() {
                    gl_FragColor = vec4(vColor, vAlpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            linewidth: 2
        });

        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);

        const trailPoints = [];
        for (let i = 0; i < this.trailLength; i++) {
            trailPoints.push(new THREE.Vector3(position.x, position.y, position.z));
        }

        return {
            mesh: mesh,
            trail: trail,
            trailPoints: trailPoints,
            trailIndex: 0,
            position: position,
            name: name,
            color: color,
            velocity: { x: 0, y: 0, z: 0 },
            baseOpacity: initialOpacity
        };
    }

    startDualTransition(oldAttractorName, newAttractorName, attractorSystem) {
        if (this.particles.length === 0) return false;
        
        const oldAttractor = attractorSystem.getAttractor(oldAttractorName);
        const newAttractor = attractorSystem.getAttractor(newAttractorName);
        
        if (!oldAttractor || !newAttractor) return false;
        
        this.oldParticles = [];
        
        this.particles.forEach(particle => {
            this.oldParticles.push({
                ...particle,
                attractorName: oldAttractorName,
                isOld: true
            });
        });
        
        const newParticles = [];
        this.oldParticles.forEach((oldParticle, index) => {
            const newParticle = this.createParticle(
                oldParticle.position.x,
                oldParticle.position.y,
                oldParticle.position.z,
                newAttractor.color,
                `${oldParticle.name} (新)`,
                0,
                0.01
            );
            newParticle.attractorName = newAttractorName;
            newParticle.isOld = false;
            newParticle.targetOpacity = oldParticle.baseOpacity;
            newParticles.push(newParticle);
        });
        
        this.particles = newParticles;
        
        this.isTransitioning = true;
        this.transitionProgress = 0;
        
        return true;
    }

    updateDualTransition() {
        if (!this.isTransitioning) return false;
        
        this.transitionProgress += 1 / this.transitionDuration;
        
        const t = this.getEasedProgress();
        
        const oldOpacity = 1.0 - t;
        const newOpacity = t;
        
        this.oldParticles.forEach(particle => {
            particle.mesh.material.opacity = particle.baseOpacity * oldOpacity;
            particle.trail.material.uniforms.globalOpacity.value = oldOpacity;
        });
        
        this.particles.forEach(particle => {
            const targetOpacity = particle.targetOpacity * newOpacity;
            particle.mesh.material.opacity = Math.min(targetOpacity, particle.targetOpacity);
            particle.trail.material.uniforms.globalOpacity.value = newOpacity;
        });
        
        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            this.isTransitioning = false;
            
            this.oldParticles.forEach(particle => {
                this.scene.remove(particle.mesh);
                this.scene.remove(particle.trail);
            });
            this.oldParticles = [];
            
            return false;
        }
        
        return true;
    }

    getEasedProgress() {
        const t = this.transitionProgress;
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    createMultiParticles(count, baseX, baseY, baseZ, baseColor) {
        this.clearAll();
        this.isMultiParticleMode = true;

        const colors = [
            0x60a5fa, 0xf87171, 0x34d399, 0xfbbf24, 
            0xa78bfa, 0xf472b6, 0x22d3ee, 0xfb923c
        ];

        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.createParticle(baseX, baseY, baseZ, color, `粒子${i + 1}`, 2);
            this.particles.push(particle);
        }
    }

    createButterflyParticles() {
        this.clearAll();
        this.isMultiParticleMode = false;

        const epsilon = 0.00001;
        const particleA = this.createParticle(0, 1, 0, 0x60a5fa, '粒子 A', 0);
        const particleB = this.createParticle(epsilon, 1, 0, 0xf87171, '粒子 B', 0);

        this.particles = [particleA, particleB];
    }

    createDefaultParticle() {
        this.clearAll();
        this.isMultiParticleMode = false;

        const particle = this.createParticle(0, 1, 0, 0x60a5fa, '粒子 A', 0);
        this.particles = [particle];
    }

    updateTrail(particle, globalOpacityScale = 1.0) {
        const positions = particle.trail.geometry.attributes.position.array;
        const alphas = particle.trail.geometry.attributes.alpha.array;
        const colors = particle.trail.geometry.attributes.color.array;

        particle.trailPoints.shift();
        particle.trailPoints.push(new THREE.Vector3(
            particle.position.x,
            particle.position.y,
            particle.position.z
        ));

        const colorObj = new THREE.Color(particle.color);

        for (let i = 0; i < this.trailLength; i++) {
            const idx = i;
            positions[i * 3] = particle.trailPoints[idx].x;
            positions[i * 3 + 1] = particle.trailPoints[idx].y;
            positions[i * 3 + 2] = particle.trailPoints[idx].z;

            const alphaRatio = i / this.trailLength;
            alphas[i] = alphaRatio * alphaRatio * 0.8 * globalOpacityScale;

            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;
        }

        particle.trail.geometry.attributes.position.needsUpdate = true;
        particle.trail.geometry.attributes.alpha.needsUpdate = true;
        particle.trail.geometry.attributes.color.needsUpdate = true;
    }

    updateParticleColor(particle, color) {
        particle.color = color.getHex();
        particle.mesh.material.color = color;
    }

    clearAll() {
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            this.scene.remove(particle.trail);
        });
        this.oldParticles.forEach(particle => {
            this.scene.remove(particle.mesh);
            this.scene.remove(particle.trail);
        });
        
        this.particles = [];
        this.oldParticles = [];
        this.isMultiParticleMode = false;
        this.isTransitioning = false;
    }

    getParticleDistance() {
        if (this.particles.length >= 2) {
            const dx = this.particles[0].position.x - this.particles[1].position.x;
            const dy = this.particles[0].position.y - this.particles[1].position.y;
            const dz = this.particles[0].position.z - this.particles[1].position.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return 0;
    }
}

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.panners = [];
        this.isEnabled = false;
        this.baseFrequency = 220;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.1;
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    createOscillator(channel = 0) {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const panner = this.audioContext.createStereoPanner();

        oscillator.type = 'sine';
        oscillator.frequency.value = this.baseFrequency + channel * 50;
        gainNode.gain.value = 0;

        oscillator.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(this.masterGain);

        oscillator.start();

        return { oscillator, gainNode, panner };
    }

    enable() {
        if (this.isEnabled) return;
        
        this.init();
        
        for (let i = 0; i < 2; i++) {
            const osc = this.createOscillator(i);
            if (osc) {
                this.oscillators.push(osc.oscillator);
                this.gainNodes.push(osc.gainNode);
                this.panners.push(osc.panner);
            }
        }
        
        this.isEnabled = true;
    }

    disable() {
        this.gainNodes.forEach(gain => {
            if (gain) gain.gain.value = 0;
        });
        this.isEnabled = false;
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    mapPositionToSound(position, particleIndex, distance = 0) {
        if (!this.isEnabled || !this.audioContext) return;

        const oscIndex = particleIndex % 2;
        const oscillator = this.oscillators[oscIndex];
        const gainNode = this.gainNodes[oscIndex];
        const panner = this.panners[oscIndex];

        if (!oscillator || !gainNode || !panner) return;

        const x = position.x;
        const y = position.y;
        const z = position.z;

        const freqBase = this.baseFrequency + (particleIndex * 30);
        const xMod = Math.sin(x * 0.05) * 100;
        const yMod = (y + 30) * 2;
        const zMod = Math.cos(z * 0.03) * 50;

        const targetFreq = freqBase + xMod + yMod + zMod;
        const clampedFreq = Math.max(50, Math.min(2000, targetFreq));

        oscillator.frequency.setTargetAtTime(clampedFreq, this.audioContext.currentTime, 0.05);

        const waveType = this.getWaveTypeFromVelocity(position);
        if (oscillator.type !== waveType) {
            oscillator.type = waveType;
        }

        const panValue = Math.max(-1, Math.min(1, x * 0.02));
        const finalPan = particleIndex === 0 ? Math.min(panValue, 0) : Math.max(panValue, 0);
        panner.pan.setTargetAtTime(finalPan, this.audioContext.currentTime, 0.1);

        let gainValue = 0.05 + Math.abs(Math.sin(y * 0.02)) * 0.1;
        
        if (distance > 0) {
            const detuneAmount = Math.min(distance * 10, 100);
            oscillator.detune.setTargetAtTime(detuneAmount * (particleIndex === 0 ? -1 : 1), 
                this.audioContext.currentTime, 0.1);
            
            const distanceGain = Math.min(distance * 0.01, 0.15);
            gainValue = 0.03 + distanceGain;
        } else {
            oscillator.detune.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        }

        gainNode.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.05);
    }

    getWaveTypeFromVelocity(position) {
        const speed = Math.sqrt(
            position.x * position.x + 
            position.y * position.y + 
            position.z * position.z
        ) * 0.01;

        if (speed < 2) return 'sine';
        if (speed < 5) return 'triangle';
        if (speed < 10) return 'sawtooth';
        return 'square';
    }

    cleanup() {
        this.disable();
        this.oscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
            try { osc.disconnect(); } catch (e) {}
        });
        this.oscillators = [];
        this.gainNodes = [];
        this.panners = [];
    }
}

class BloomEffect {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.enabled = true;
        
        this.bloomScene = new THREE.Scene();
        this.bloomCamera = camera;
        
        this.renderTarget1 = new THREE.WebGLRenderTarget(
            window.innerWidth / 2, 
            window.innerHeight / 2,
            { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
        );
        this.renderTarget2 = this.renderTarget1.clone();
        
        this.blurMaterial = this.createBlurMaterial();
        this.bloomCompositeMaterial = this.createBloomCompositeMaterial();
        
        this.quadScene = new THREE.Scene();
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.blurMaterial
        );
        this.quadScene.add(this.quad);
    }

    createBlurMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                direction: { value: new THREE.Vector2(1, 0) },
                resolution: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 direction;
                uniform vec2 resolution;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = vec4(0.0);
                    vec2 texelSize = 1.0 / resolution;
                    
                    float weights[5];
                    weights[0] = 0.227027;
                    weights[1] = 0.1945946;
                    weights[2] = 0.1216216;
                    weights[3] = 0.054054;
                    weights[4] = 0.016216;
                    
                    color += texture2D(tDiffuse, vUv) * weights[0];
                    
                    for (int i = 1; i < 5; i++) {
                        vec2 offset = direction * texelSize * float(i) * 2.0;
                        color += texture2D(tDiffuse, vUv + offset) * weights[i];
                        color += texture2D(tDiffuse, vUv - offset) * weights[i];
                    }
                    
                    gl_FragColor = color;
                }
            `
        });
    }

    createBloomCompositeMaterial() {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tBloom: { value: null },
                bloomStrength: { value: 1.5 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tBloom;
                uniform float bloomStrength;
                varying vec2 vUv;
                
                void main() {
                    vec4 base = texture2D(tDiffuse, vUv);
                    vec4 bloom = texture2D(tBloom, vUv);
                    
                    vec3 result = base.rgb + bloom.rgb * bloomStrength;
                    result = result / (result + vec3(1.0));
                    result = pow(result, vec3(1.0 / 2.2));
                    
                    gl_FragColor = vec4(result, base.a);
                }
            `
        });
    }

    extractBrightObjects() {
        this.bloomScene.children = [];
        
        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                const clone = obj.clone();
                
                if (clone.material.emissive) {
                    const brightness = clone.material.emissive.r + clone.material.emissive.g + clone.material.emissive.b;
                    if (brightness > 0.1) {
                        clone.material = new THREE.MeshBasicMaterial({
                            color: clone.material.color,
                            transparent: true,
                            opacity: clone.material.opacity || 1
                        });
                        this.bloomScene.add(clone);
                    }
                } else if (clone.material.color) {
                    const brightness = clone.material.color.r + clone.material.color.g + clone.material.color.b;
                    if (brightness > 0.5) {
                        clone.material = new THREE.MeshBasicMaterial({
                            color: clone.material.color,
                            transparent: true,
                            opacity: clone.material.opacity || 1
                        });
                        this.bloomScene.add(clone);
                    }
                }
            }
        });
    }

    render() {
        if (!this.enabled) return;

        const originalRenderTarget = this.renderer.getRenderTarget();
        
        this.extractBrightObjects();
        
        this.renderer.setRenderTarget(this.renderTarget1);
        this.renderer.render(this.bloomScene, this.bloomCamera);
        
        this.quad.material = this.blurMaterial;
        
        this.blurMaterial.uniforms.tDiffuse.value = this.renderTarget1.texture;
        this.blurMaterial.uniforms.direction.value.set(1, 0);
        this.renderer.setRenderTarget(this.renderTarget2);
        this.renderer.render(this.quadScene, this.quadCamera);
        
        this.blurMaterial.uniforms.tDiffuse.value = this.renderTarget2.texture;
        this.blurMaterial.uniforms.direction.value.set(0, 1);
        this.renderer.setRenderTarget(this.renderTarget1);
        this.renderer.render(this.quadScene, this.quadCamera);
        
        this.quad.material = this.bloomCompositeMaterial;
        this.bloomCompositeMaterial.uniforms.tDiffuse.value = originalRenderTarget ? 
            originalRenderTarget.texture : null;
        this.bloomCompositeMaterial.uniforms.tBloom.value = this.renderTarget1.texture;
        
        this.renderer.setRenderTarget(originalRenderTarget);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    resize() {
        const width = window.innerWidth / 2;
        const height = window.innerHeight / 2;
        this.renderTarget1.setSize(width, height);
        this.renderTarget2.setSize(width, height);
        this.blurMaterial.uniforms.resolution.value.set(width, height);
    }
}

class LLMConfigManager {
    constructor() {
        this.config = {
            baseUrl: '',
            apiKey: '',
            modelName: '',
            isConnected: false
        };
        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('llm_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load LLM config:', e);
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('llm_config', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Failed to save LLM config:', e);
        }
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveToLocalStorage();
    }

    async testConnection() {
        if (!this.config.baseUrl || !this.config.apiKey) {
            return { success: false, error: '请填写Base URL和API Key' };
        }

        try {
            const baseUrl = this.config.baseUrl.endsWith('/') 
                ? this.config.baseUrl.slice(0, -1) 
                : this.config.baseUrl;
            
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.config.isConnected = true;
                this.saveToLocalStorage();
                return { success: true, message: '连接成功！' };
            } else {
                const errorText = await response.text();
                return { success: false, error: `连接失败: ${response.status} - ${errorText}` };
            }
        } catch (e) {
            return { success: false, error: `连接错误: ${e.message}` };
        }
    }

    async sendChatMessage(messages) {
        if (!this.config.isConnected) {
            return { success: false, error: '未连接到LLM服务，请先测试连接' };
        }

        try {
            const baseUrl = this.config.baseUrl.endsWith('/') 
                ? this.config.baseUrl.slice(0, -1) 
                : this.config.baseUrl;
            
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.modelName,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    content: data.choices[0]?.message?.content || '' 
                };
            } else {
                const errorText = await response.text();
                return { success: false, error: `请求失败: ${response.status} - ${errorText}` };
            }
        } catch (e) {
            return { success: false, error: `请求错误: ${e.message}` };
        }
    }
}

class EnhancedAttractorVisualization {
    constructor() {
        this.attractorSystem = new AttractorSystem();
        this.particleSystem = null;
        this.audioSystem = new AudioSystem();
        this.bloomEffect = null;
        this.llmConfigManager = new LLMConfigManager();
        
        this.dt = 0.01;
        this.isRunning = false;
        this.animationId = null;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        this.renderTarget = null;
        this.quadScene = null;
        this.quadCamera = null;
        this.quadMesh = null;
        this.bloomCompositeMaterial = null;
        
        this.init();
        this.createWarningOverlay();
        this.createLLMConfigPanel();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        const container = document.getElementById('canvas-container');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(50, 30, 80);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
        
        this.renderTarget = new THREE.WebGLRenderTarget(
            container.clientWidth, 
            container.clientHeight,
            { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
        );
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI;
        
        const axisHelper = new THREE.AxesHelper(30);
        this.scene.add(axisHelper);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x4a9eff, 1, 200);
        pointLight1.position.set(50, 50, 50);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x10b981, 0.8, 200);
        pointLight2.position.set(-50, -50, 50);
        this.scene.add(pointLight2);
        
        const gridHelper = new THREE.GridHelper(100, 20, 0x333333, 0x222222);
        gridHelper.position.y = -30;
        this.scene.add(gridHelper);
        
        this.particleSystem = new ParticleSystem(this.scene);
        this.bloomEffect = new BloomEffect(this.scene, this.renderer, this.camera);
        
        this.initBloomComposite();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    initBloomComposite() {
        this.quadScene = new THREE.Scene();
        this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        this.bloomCompositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: this.renderTarget.texture },
                tBloom: { value: this.bloomEffect.renderTarget1.texture },
                bloomStrength: { value: 1.5 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform sampler2D tBloom;
                uniform float bloomStrength;
                varying vec2 vUv;
                
                void main() {
                    vec4 base = texture2D(tDiffuse, vUv);
                    vec4 bloom = texture2D(tBloom, vUv);
                    
                    vec3 result = base.rgb + bloom.rgb * bloomStrength;
                    result = result / (result + vec3(1.0));
                    result = pow(result, vec3(1.0 / 2.2));
                    
                    gl_FragColor = vec4(result, base.a);
                }
            `
        });
        
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        this.quadMesh = new THREE.Mesh(quadGeometry, this.bloomCompositeMaterial);
        this.quadScene.add(this.quadMesh);
    }

    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    isParticlePositionValid(particle) {
        return this.isValidNumber(particle.position.x) &&
               this.isValidNumber(particle.position.y) &&
               this.isValidNumber(particle.position.z);
    }

    createWarningOverlay() {
        const container = document.getElementById('canvas-container');
        
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
        
        document.getElementById('warning-close-btn').addEventListener('click', () => {
            this.hideWarning();
        });
    }

    showWarning(message) {
        const overlay = document.getElementById('warning-overlay');
        const messageElement = document.getElementById('warning-message');
        
        messageElement.textContent = message;
        overlay.style.display = 'flex';
        
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'warning-title');
        overlay.focus();
    }

    hideWarning() {
        const overlay = document.getElementById('warning-overlay');
        overlay.style.display = 'none';
        overlay.removeAttribute('role');
        overlay.removeAttribute('aria-modal');
        overlay.removeAttribute('aria-labelledby');
    }

    handleNumericalError(particle) {
        this.pauseSimulation();
        
        const warningMessage = `检测到数值异常！
粒子 "${particle.name}" 的坐标出现无效值（NaN 或 Infinity）。
这可能是由于参数设置不当导致的。

模拟已自动暂停，请重置后使用更安全的参数。`;

        this.showWarning(warningMessage);
        console.error('Numerical error detected for particle:', particle.name);
    }

    createLLMConfigPanel() {
        const container = document.getElementById('canvas-container');
        
        const llmPanel = document.createElement('div');
        llmPanel.id = 'llm-config-panel';
        llmPanel.className = 'llm-config-panel';
        llmPanel.innerHTML = `
            <div class="llm-config-content">
                <div class="llm-config-header">
                    <h3>🧠 LLM 配置</h3>
                    <button class="llm-close-btn" id="llm-close-btn">×</button>
                </div>
                <div class="llm-config-body">
                    <div class="llm-param">
                        <label for="llm-baseurl">Base URL:</label>
                        <input type="text" id="llm-baseurl" placeholder="例如: https://api.openai.com/v1" value="${this.llmConfigManager.config.baseUrl}">
                    </div>
                    <div class="llm-param">
                        <label for="llm-apikey">API Key:</label>
                        <input type="password" id="llm-apikey" placeholder="请输入API Key" value="${this.llmConfigManager.config.apiKey}">
                    </div>
                    <div class="llm-param">
                        <label for="llm-model">Model Name:</label>
                        <input type="text" id="llm-model" placeholder="例如: gpt-3.5-turbo" value="${this.llmConfigManager.config.modelName}">
                    </div>
                    <div class="llm-status" id="llm-status">
                        <span class="status-indicator" id="llm-status-indicator"></span>
                        <span id="llm-status-text">未连接</span>
                    </div>
                    <div class="llm-buttons">
                        <button class="llm-btn llm-btn-test" id="llm-test-btn">测试连接</button>
                        <button class="llm-btn llm-btn-save" id="llm-save-btn">保存配置</button>
                    </div>
                    <div id="llm-test-result" class="llm-test-result"></div>
                </div>
            </div>
        `;
        llmPanel.style.display = 'none';
        container.appendChild(llmPanel);
        
        document.getElementById('llm-close-btn').addEventListener('click', () => {
            this.hideLLMConfigPanel();
        });
        
        document.getElementById('llm-save-btn').addEventListener('click', () => {
            this.saveLLMConfig();
        });
        
        document.getElementById('llm-test-btn').addEventListener('click', () => {
            this.testLLMConnection();
        });
        
        this.updateLLMStatusDisplay();
    }

    showLLMConfigPanel() {
        const panel = document.getElementById('llm-config-panel');
        panel.style.display = 'flex';
        
        document.getElementById('llm-baseurl').value = this.llmConfigManager.config.baseUrl;
        document.getElementById('llm-apikey').value = this.llmConfigManager.config.apiKey;
        document.getElementById('llm-model').value = this.llmConfigManager.config.modelName;
    }

    hideLLMConfigPanel() {
        const panel = document.getElementById('llm-config-panel');
        panel.style.display = 'none';
    }

    saveLLMConfig() {
        const baseUrl = document.getElementById('llm-baseurl').value.trim();
        const apiKey = document.getElementById('llm-apikey').value.trim();
        const modelName = document.getElementById('llm-model').value.trim();
        
        this.llmConfigManager.updateConfig({
            baseUrl,
            apiKey,
            modelName
        });
        
        this.showLLMTestResult('配置已保存！', true);
        this.updateLLMStatusDisplay();
    }

    async testLLMConnection() {
        const testBtn = document.getElementById('llm-test-btn');
        const originalText = testBtn.textContent;
        testBtn.textContent = '测试中...';
        testBtn.disabled = true;
        
        const baseUrl = document.getElementById('llm-baseurl').value.trim();
        const apiKey = document.getElementById('llm-apikey').value.trim();
        const modelName = document.getElementById('llm-model').value.trim();
        
        this.llmConfigManager.updateConfig({
            baseUrl,
            apiKey,
            modelName
        });
        
        const result = await this.llmConfigManager.testConnection();
        
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        
        if (result.success) {
            this.showLLMTestResult(result.message, true);
        } else {
            this.showLLMTestResult(result.error, false);
        }
        
        this.updateLLMStatusDisplay();
    }

    showLLMTestResult(message, isSuccess) {
        const resultEl = document.getElementById('llm-test-result');
        resultEl.textContent = message;
        resultEl.className = `llm-test-result ${isSuccess ? 'success' : 'error'}`;
        resultEl.style.display = 'block';
        
        setTimeout(() => {
            resultEl.style.display = 'none';
        }, 5000);
    }

    updateLLMStatusDisplay() {
        const indicator = document.getElementById('llm-status-indicator');
        const text = document.getElementById('llm-status-text');
        
        if (this.llmConfigManager.config.isConnected) {
            indicator.className = 'status-indicator connected';
            text.textContent = '已连接';
        } else {
            indicator.className = 'status-indicator';
            text.textContent = '未连接';
        }
    }

    calculateNextStep(particle, attractorName) {
        if (!this.isParticlePositionValid(particle)) {
            this.handleNumericalError(particle);
            return false;
        }

        const attractor = this.attractorSystem.getAttractor(attractorName);
        if (!attractor) return false;
        
        const scale = attractor.scale;
        
        const scaledPosition = {
            x: particle.position.x / scale,
            y: particle.position.y / scale,
            z: particle.position.z / scale
        };

        const result = attractor.equations(
            scaledPosition.x, 
            scaledPosition.y, 
            scaledPosition.z, 
            attractor.params, 
            this.dt
        );
        
        if (!this.isValidNumber(result.dx) || !this.isValidNumber(result.dy) || !this.isValidNumber(result.dz)) {
            this.handleNumericalError(particle);
            return false;
        }

        particle.position.x += result.dx * scale;
        particle.position.y += result.dy * scale;
        particle.position.z += result.dz * scale;

        if (!this.isParticlePositionValid(particle)) {
            this.handleNumericalError(particle);
            return false;
        }

        const maxPosition = 1000;
        if (Math.abs(particle.position.x) > maxPosition ||
            Math.abs(particle.position.y) > maxPosition ||
            Math.abs(particle.position.z) > maxPosition) {
            this.handleNumericalError(particle);
            return false;
        }

        particle.mesh.position.set(
            particle.position.x,
            particle.position.y,
            particle.position.z
        );

        return true;
    }

    startSimulation() {
        if (this.isRunning) return;
        
        if (this.particleSystem.particles.length === 0) {
            this.particleSystem.createDefaultParticle();
        }
        
        this.isRunning = true;
        document.getElementById('start-btn').textContent = '暂停模拟';
        document.getElementById('start-btn').classList.add('running');
    }

    pauseSimulation() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        document.getElementById('start-btn').textContent = '继续模拟';
        document.getElementById('start-btn').classList.remove('running');
    }

    toggleSimulation() {
        if (this.isRunning) {
            this.pauseSimulation();
        } else {
            this.startSimulation();
        }
    }

    switchAttractor(attractorName) {
        if (this.particleSystem.isTransitioning) return;
        
        const currentAttractor = this.attractorSystem.getCurrentAttractor();
        
        if (currentAttractor && attractorName !== this.attractorSystem.currentAttractor) {
            const oldAttractorName = this.attractorSystem.currentAttractor;
            
            if (this.particleSystem.particles.length > 0) {
                this.particleSystem.startDualTransition(
                    oldAttractorName,
                    attractorName,
                    this.attractorSystem
                );
            }
            
            this.attractorSystem.setAttractor(attractorName);
            this.updateParamControls();
            this.updateAttractorInfo();
            this.updateAttractorButtons(attractorName);
        }
    }

    updateAttractorButtons(activeName) {
        const buttonMap = {
            'lorenz': 'lorenz-btn',
            'rossler': 'rossler-btn',
            'chen': 'chen-btn',
            'aizawa': 'aizawa-btn'
        };
        
        Object.keys(buttonMap).forEach(name => {
            const btn = document.getElementById(buttonMap[name]);
            if (btn) {
                if (name === activeName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    updateParamControls() {
        const attractor = this.attractorSystem.getCurrentAttractor();
        const params = attractor.params;
        const ranges = attractor.paramRanges;
        
        const paramContainer = document.getElementById('dynamic-params');
        if (!paramContainer) return;
        
        let html = '';
        for (const key in params) {
            const value = params[key];
            const [min, max] = ranges[key];
            const step = (max - min) / 100;
            
            html += `
                <div class="parameter">
                    <label for="param-${key}">${key}: <span id="param-${key}-value">${value.toFixed(3)}</span></label>
                    <input type="range" id="param-${key}" min="${min}" max="${max}" step="${step.toFixed(4)}" value="${value}">
                    <p class="description">${this.getParamDescription(key)}</p>
                </div>
            `;
        }
        paramContainer.innerHTML = html;
        
        for (const key in params) {
            const slider = document.getElementById(`param-${key}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    attractor.params[key] = val;
                    document.getElementById(`param-${key}-value`).textContent = val.toFixed(3);
                });
            }
        }
    }

    getParamDescription(key) {
        const descriptions = {
            sigma: '普朗特数 - 描述流体粘性与热扩散的比值',
            rho: '瑞利数 - 控制对流强度',
            beta: '几何形状参数',
            a: '控制x-y平面振荡频率',
            b: '控制z轴行为',
            c: '控制整体混沌行为',
            alpha: '控制z轴阻尼',
            beta: '控制x-y平面旋转',
            gamma: '基础旋转频率',
            epsilon: '控制非线性项强度',
            zeta: '控制z轴反馈',
            eta: '控制z轴偏移'
        };
        return descriptions[key] || '系统参数';
    }

    updateAttractorInfo() {
        const attractor = this.attractorSystem.getCurrentAttractor();
        const infoElement = document.getElementById('attractor-info');
        if (infoElement) {
            infoElement.innerHTML = `
                <h3>关于${attractor.name}</h3>
                <p>${attractor.description}</p>
            `;
        }
    }

    enableMultiParticleMode(count = 100) {
        this.particleSystem.createMultiParticles(count, 0, 1, 0, 0x60a5fa);
        
        if (!this.isRunning) {
            this.startSimulation();
        }
    }

    startButterflyEffect() {
        this.particleSystem.createButterflyParticles();
        
        if (!this.isRunning) {
            this.startSimulation();
        }
    }

    toggleAudio() {
        return this.audioSystem.toggle();
    }

    toggleBloom() {
        return this.bloomEffect.toggle();
    }

    clearTrails() {
        this.particleSystem.clearAll();
        this.updateCoordinates();
    }

    reset() {
        this.pauseSimulation();
        this.clearTrails();
        this.audioSystem.disable();
        
        this.attractorSystem = new AttractorSystem();
        
        document.getElementById('start-btn').textContent = '开始模拟';
        document.getElementById('start-btn').classList.remove('running');
        
        this.updateParamControls();
        this.updateAttractorInfo();
        this.updateAttractorButtons('lorenz');
        
        this.camera.position.set(50, 30, 80);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }

    updateCoordinates() {
        const particles = this.particleSystem.particles;
        
        if (particles[0]) {
            document.getElementById('a-x').textContent = particles[0].position.x.toFixed(5);
            document.getElementById('a-y').textContent = particles[0].position.y.toFixed(5);
            document.getElementById('a-z').textContent = particles[0].position.z.toFixed(5);
        } else {
            document.getElementById('a-x').textContent = '-';
            document.getElementById('a-y').textContent = '-';
            document.getElementById('a-z').textContent = '-';
        }
        
        if (particles[1]) {
            document.getElementById('b-x').textContent = particles[1].position.x.toFixed(5);
            document.getElementById('b-y').textContent = particles[1].position.y.toFixed(5);
            document.getElementById('b-z').textContent = particles[1].position.z.toFixed(5);
            
            const distance = this.particleSystem.getParticleDistance();
            document.getElementById('distance').textContent = distance.toFixed(5);
        } else {
            document.getElementById('b-x').textContent = '-';
            document.getElementById('b-y').textContent = '-';
            document.getElementById('b-z').textContent = '-';
            document.getElementById('distance').textContent = '-';
        }
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.toggleSimulation();
        });
        
        document.getElementById('butterfly-btn').addEventListener('click', () => {
            this.startButterflyEffect();
        });
        
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearTrails();
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('lorenz-btn')?.addEventListener('click', () => {
            this.switchAttractor('lorenz');
        });
        
        document.getElementById('rossler-btn')?.addEventListener('click', () => {
            this.switchAttractor('rossler');
        });
        
        document.getElementById('chen-btn')?.addEventListener('click', () => {
            this.switchAttractor('chen');
        });
        
        document.getElementById('aizawa-btn')?.addEventListener('click', () => {
            this.switchAttractor('aizawa');
        });
        
        const particleCountSlider = document.getElementById('particle-count');
        const particleCountValue = document.getElementById('particle-count-value');
        if (particleCountSlider && particleCountValue) {
            particleCountSlider.addEventListener('input', (e) => {
                particleCountValue.textContent = e.target.value;
            });
        }
        
        document.getElementById('multi-particle-btn')?.addEventListener('click', () => {
            const count = parseInt(document.getElementById('particle-count')?.value || '100');
            this.enableMultiParticleMode(count);
        });
        
        document.getElementById('audio-toggle')?.addEventListener('click', (e) => {
            const enabled = this.toggleAudio();
            e.target.textContent = enabled ? '🔊 声音: 开' : '🔇 声音: 关';
            e.target.classList.toggle('active', enabled);
        });
        
        document.getElementById('bloom-toggle')?.addEventListener('click', (e) => {
            const enabled = this.toggleBloom();
            e.target.textContent = enabled ? '✨ Bloom: 开' : '💫 Bloom: 关';
            e.target.classList.toggle('active', enabled);
        });
        
        document.getElementById('llm-config-btn')?.addEventListener('click', () => {
            this.showLLMConfigPanel();
        });
        
        this.updateParamControls();
        this.updateAttractorInfo();
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderTarget.setSize(container.clientWidth, container.clientHeight);
        this.bloomEffect.resize();
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        if (this.particleSystem.isTransitioning) {
            this.particleSystem.updateDualTransition();
        }
        
        if (this.isRunning) {
            const iterationsPerFrame = 5;
            let hasError = false;
            const currentAttractorName = this.attractorSystem.currentAttractor;
            
            for (let i = 0; i < iterationsPerFrame && !hasError; i++) {
                for (let j = 0; j < this.particleSystem.particles.length && !hasError; j++) {
                    const particle = this.particleSystem.particles[j];
                    const result = this.calculateNextStep(particle, particle.attractorName || currentAttractorName);
                    if (result === false) {
                        hasError = true;
                    } else {
                        this.particleSystem.updateTrail(particle);
                    }
                    
                    if (this.audioSystem.isEnabled && j < 2 && !this.particleSystem.isTransitioning) {
                        const distance = this.particleSystem.getParticleDistance();
                        this.audioSystem.mapPositionToSound(
                            particle.position,
                            j,
                            this.particleSystem.particles.length >= 2 ? distance : 0
                        );
                    }
                }
                
                for (let j = 0; j < this.particleSystem.oldParticles.length && !hasError; j++) {
                    const particle = this.particleSystem.oldParticles[j];
                    const result = this.calculateNextStep(particle, particle.attractorName || currentAttractorName);
                    if (result === false) {
                        hasError = true;
                    } else {
                        this.particleSystem.updateTrail(particle);
                    }
                }
            }
            
            if (!hasError) {
                this.updateCoordinates();
            }
        }
        
        if (this.bloomEffect.enabled) {
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);
            
            this.bloomEffect.render();
            
            this.bloomCompositeMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
            this.bloomCompositeMaterial.uniforms.tBloom.value = this.bloomEffect.renderTarget1.texture;
            
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.quadScene, this.quadCamera);
        } else {
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">初始化混沌吸引子可视化...</div>
        </div>
    `;
    container.appendChild(loadingOverlay);
    
    setTimeout(() => {
        const app = new EnhancedAttractorVisualization();
        
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 500);
        }, 500);
        
        window.lorenzApp = app;
    }, 100);
});
