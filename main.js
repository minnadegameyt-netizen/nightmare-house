import * as THREE from 'three';
import { playRescueMovieSequence } from './RescueMovieAnimation.js';
class NightmareGame {
    constructor() {
        this.gameState = 'START'; // START, INTRO, PLAYING, DIALOGUE
        this.hasKey = false;
        this.isDoorOpen = false;
        this.hasCheckedStairs = false;
        this.isSisterDoorOpen = false;
        this.isSisterEventTriggered = false;
        this.hasCheckedSisterBed = false;
        this.hasCheckedSisterDiary = false;
        this.hasCheckedPhoto = false;
        this.loop3_1f_cinematic_triggered = false;
        this.currentFloor = 2;

        // Items and Room State
        this.hasLeftRoomKey = false;
        this.isLeftRoomOpen = false;
        this.isRightRoomOpen = false;
        this.hasOpenedParentsBox = false;

        this.is2FLeftRoomTrapArmed = false;
        this.is2FLeftRoomTrapped = false;
        this.is2FEscapeReady = false;
        this.isCinematicPlaying = false;
        this.canExitHouse = false;
        this.loop4_fridge_checked = false;
        this.loop4_toilet_button_count = 0;
        this.hasHouseMap = false;
        this.inventory = [];
        this.loopCount = 1;
        this.loop2_puzzles = { diary: false, entrance: false, room: false };
        this.mazeProgress = 0;
        this.mazeAnswers = ['RIGHT', 'LEFT', 'RIGHT', 'RIGHT', 'LEFT', 'RIGHT'];
        this.monster = null;
        this.isMonsterCaught = false;
        this.isEndingSequence = false;
        this.collisionObjects1F = [];
        this.collisionObjects2F = [];
        this.introTimeouts = [];
        this.hasCheckedEntranceKeypad = false;
        this.hasCheckedParentsRoom = false; // 追加：入場チェック用フラグ
        this.hasTriggeredLoop2RoomEvent = false; // 追加：2周目左部屋イベント用フラグ
        this.hasShownPostKeypad2FDialogue = false; // 追加：2周目テンキー解錠後の2階移動独白用フラグ
        this.loop4_memory_count = 0; // 追加：4周目の記憶回収数
        this.loop4_memories = { sister_room: false, living_room: false }; // 必須記憶ポイント
        this.loop4_shadows = []; // 4周目に出現させる影（スプライト）のリスト
        this.lastChoiceTime = 0; // 追加：入力重複防止用タイマー
        this.lastDialogueCloseTime = 0; // 追加：ダイアログ閉了後の再判定防止タイマー
        this.loop5_toilet_warning_triggered = false; // 追加：5周目トイレ回廊メッセージ用フラグ
        this.loop4_blockers = [];
        this.hasSeenBlockers = false;
        this.hasSeenStairsWatcher = false;

        // Settings State
        this.userBrightness = 1.0;   // プレイヤーが設定した明るさ
        this.sceneBrightness = 1.0;  // 演出上の明るさ倍率
        this.volume = 0.5;
        this.allLights = []; // To track all lights for brightness adjustment

        this.scene = new THREE.Scene();
        this.mapRoot = new THREE.Group();
        this.scene.add(this.mapRoot);
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.05);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app').appendChild(this.renderer.domElement);

        this.progress = 99.000;
        this.completedEvents = new Set();

        this.keys = { w: false, a: false, s: false, d: false, space: false };
        this.interactCooldown = false;
        this.interactables = [];

        this.setupLights();
        this.createPlayer();
        this.createMap();
        // this.setupAudio(); // Now called indirectly via preloadAssets()
        this.setupInput();
        this.setupUI();

        // Start preloading
        this.preloadAssets();

        this.animate();

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('blur', () => {
            this.keys = { w: false, a: false, s: false, d: false, space: false };
        });
    }

    async preloadAssets() {
        const audioFiles = [
            { id: 'ambient', path: './audio/ambient.mp3' },
            { id: 'rain', path: './audio/rain.mp3' },
            { id: 'chase', path: './audio/chase.mp3' },
            { id: 'footstep', path: './audio/footstep.mp3' },
            { id: 'door_open', path: './audio/door_open.mp3' },
            { id: 'stairs', path: './audio/stairs.mp3' },
            { id: 'knock', path: './audio/knock.mp3' },
            { id: 'thud_2f', path: './audio/thud_2f.mp3' },
            { id: 'heavy_footsteps', path: './audio/heavy_footstep.mp3' },
            { id: 'item_get', path: './audio/item_get.mp3' },
            { id: 'keypad_unlock', path: './audio/keypad_unlock.mp3' },
            { id: 'thud', path: './audio/thud.mp3' },
            { id: 'bark', path: './audio/bark.mp3' },
            { id: 'slap', path: './audio/slap.mp3' },
            { id: 'heartbeat', path: './audio/heartbeat.mp3' },
            { id: 'puzzle_clear', path: './audio/puzzle_clear.mp3' },
            { id: 'noise_rush', path: './audio/noise_rush.mp3' },
            { id: 'heavy_hit', path: './audio/heavy_hit.mp3' },
            { id: 'toilet', path: './audio/toilet.mp3' },
            { id: 'monster_roar', path: './audio/monster_roar.mp3' }
        ];

        const imageFiles = [
            './happy.png',
            './creepy.png',
            './images/creepy_entity.png',
            './images/poro.png',
            './images/sister.png',
            './images/sister_monster.png'
        ];

        const total = audioFiles.length + imageFiles.length;
        let loadedCount = 0;

        const updateProgress = () => {
            loadedCount++;
            const percent = Math.floor((loadedCount / total) * 100);
            const bar = document.getElementById('loading-bar');
            const text = document.getElementById('loading-percentage');
            if (bar) bar.style.width = `${percent}%`;
            if (text) text.textContent = `${percent}%`;
        };

        const loadAudio = (item) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.addEventListener('canplaythrough', () => {
                    updateProgress();
                    resolve({ id: item.id, audio });
                }, { once: true });
                audio.addEventListener('error', () => {
                    console.error("Failed to load audio:", item.path);
                    updateProgress();
                    resolve(null);
                }, { once: true });
                audio.src = item.path;
                audio.load();
            });
        };

        const loadImage = (path) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    updateProgress();
                    resolve(img);
                };
                img.onerror = () => {
                    console.error("Failed to load image:", path);
                    updateProgress();
                    resolve(null);
                };
                img.src = path;
            });
        };

        console.log("Starting asset preloading...");

        // Load all concurrently
        const audioPromises = audioFiles.map(loadAudio);
        const imagePromises = imageFiles.map(loadImage);

        const loadedAudios = await Promise.all(audioPromises);
        await Promise.all(imagePromises);

        // Map loaded audios back to soundAssets
        this.soundAssets = {};
        loadedAudios.forEach(item => {
            if (item) {
                this.soundAssets[item.id] = item.audio;
            }
        });

        // Initialize audio settings now that they are loaded
        this.initAudioAfterLoad();

        // Finish preloading
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const startScreen = document.getElementById('start-screen');
            if (loadingScreen) loadingScreen.style.opacity = '0';
            setTimeout(() => {
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (startScreen) startScreen.style.display = 'flex';
            }, 1000);
        }, 500);
    }

    initAudioAfterLoad() {
        // Configure looping for specific assets
        if (this.soundAssets.ambient) this.soundAssets.ambient.loop = true;
        if (this.soundAssets.rain) this.soundAssets.rain.loop = true;
        if (this.soundAssets.chase) this.soundAssets.chase.loop = true;
        if (this.soundAssets.footstep) this.soundAssets.footstep.loop = true;

        this.updateAudioVolumes();
    }


    // setupAudio functionality is now handled by preloadAssets and initAudioAfterLoad


    updateAudioVolumes() {
        Object.values(this.soundAssets).forEach(audio => {
            audio.volume = this.volume;
        });
        // 特定の音を強調
        if (this.soundAssets.item_get) this.soundAssets.item_get.volume = Math.min(1.0, this.volume * 1.8);
        if (this.soundAssets.stairs) this.soundAssets.stairs.volume = Math.min(1.0, this.volume * 1.8);
        if (this.soundAssets.slap) this.soundAssets.slap.volume = Math.min(1.0, this.volume * 2.0);

        this.soundAssets.footstep.volume = this.volume;
    }

    setupUI() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        const startScreen = document.getElementById('start-screen');
        const instructionScreen = document.getElementById('instruction-screen');
        const systemBootBtn = document.getElementById('system-boot-btn');

        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            instructionScreen.style.display = 'flex';
        });

        systemBootBtn.addEventListener('click', () => {
            instructionScreen.style.display = 'none';
            this.startIntro();
        });

        // Settings Toggles
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsCloseBtn = document.getElementById('settings-close-btn');

        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'block';
        });

        settingsCloseBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
        });

        // Sliders
        const brightnessSlider = document.getElementById('brightness-slider');
        brightnessSlider.addEventListener('input', (e) => {
            this.userBrightness = parseFloat(e.target.value);
            this.applyBrightness(); // 再計算して適用
        });

        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', (e) => {
            this.volume = parseFloat(e.target.value);
            this.updateAudioVolumes();
        });

        const itemsBtn = document.getElementById('items-btn');
        itemsBtn.addEventListener('click', () => {
            this.toggleInventory();
        });

        document.getElementById('inventory-close-btn').addEventListener('click', () => {
            this.toggleInventory(false);
        });

        // Map Toggle Buttons
        document.getElementById('toggle-1f').addEventListener('click', () => this.switchMapFloor(1));
        document.getElementById('toggle-2f').addEventListener('click', () => this.switchMapFloor(2));

        // Keypad Buttons
        document.querySelectorAll('.keypad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleKeypadInput(e.target.textContent);
            });
        });
    }

    handleKeypadInput(val) {
        const display = document.getElementById('keypad-display');
        if (val === '✕' || val === 'cancel') {
            this.closeKeypad();
            return;
        }
        if (val === 'CLEAR' || val === 'clear') {
            display.textContent = '----';
            return;
        }
        if (display.textContent === '----') display.textContent = '';
        if (display.textContent.length < 4) {
            display.textContent += val;
            if (display.textContent.length === 4) {
                this.checkPuzzleCode(display.textContent);
            }
        }
    }

    closeKeypad() {
        document.getElementById('puzzle-overlay').style.display = 'none';
        if (this.gameState === 'UI_OPEN') this.gameState = 'PLAYING';
    }

    toggleInventory(force) {
        const panel = document.getElementById('inventory-panel');
        const show = (force !== undefined) ? force : (panel.style.display === 'none');
        panel.style.display = show ? 'block' : 'none';

        if (show) {
            this.updateInventoryUI();
            this.gameState = 'UI_OPEN';
        } else if (this.gameState === 'UI_OPEN') {
            this.gameState = 'PLAYING';
        }
    }

    updateInventoryUI() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';

        if (this.inventory.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 20px; color:#666;">アイテムを持っていません</div>';
            return;
        }

        this.inventory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'inventory-item';
            div.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.name}</span>
            `;
            div.onclick = () => {
                this.toggleInventory(false);
                item.action();
            };
            list.appendChild(div);
        });
    }

    showMap() {
        this.gameState = 'MAP_VIEW';
        // 追加：足音停止とキーリセット
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets && this.soundAssets.footstep) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        this.mapViewFloor = this.currentFloor;
        const overlay = document.getElementById('map-overlay');
        overlay.style.display = 'flex';
        this.renderMap();
    }

    switchMapFloor(floor) {
        this.mapViewFloor = floor;
        this.renderMap();
    }

    renderMap() {
        const mapRooms = document.getElementById('map-rooms');
        const title = document.getElementById('map-floor-title');
        mapRooms.innerHTML = '';

        // Update Button Active States
        document.getElementById('toggle-1f').classList.toggle('active', this.mapViewFloor === 1);
        document.getElementById('toggle-2f').classList.toggle('active', this.mapViewFloor === 2);

        if (this.mapViewFloor === 2) {
            title.innerText = '2F 見取り図';
            this.addMapRoom('僕の部屋', 'room-2f-boy');
            this.addMapRoom('廊下', 'room-2f-hall');
            this.addMapRoom('姉の部屋', 'room-2f-sister');
            this.addMapRoom('物入', 'room-2f-left');
        } else {
            title.innerText = '1F 見取り図';
            this.addMapRoom('廊下', 'room-1f-hall');
            this.addMapRoom('リビング', 'room-1f-living');
            this.addMapRoom('キッチン', 'room-1f-kitchen');
            this.addMapRoom('トイレ', 'room-1f-toilet');
            this.addMapRoom('物入', 'room-1f-left');
            this.addMapRoom('両親の部屋', 'room-1f-parents');
        }

        this.updateMapMarker();
    }

    addMapRoom(name, className) {
        const r = document.createElement('div');
        r.className = `map-room ${className}`;
        r.innerHTML = `<span class="room-label">${name}</span>`;
        document.getElementById('map-rooms').appendChild(r);
    }

    closeMap() {
        this.gameState = 'PLAYING';
        document.getElementById('map-overlay').style.display = 'none';
    }

    updateMapMarker() {
        if (this.gameState !== 'MAP_VIEW') return;
        const marker = document.getElementById('player-marker');

        // Only show marker if viewing the floor the player is actually on
        if (this.mapViewFloor !== this.currentFloor) {
            marker.style.opacity = '0';
            marker.style.pointerEvents = 'none';
            // Move it far away to be absolutely sure
            marker.style.left = '-1000%';
            return;
        }
        marker.style.opacity = '1';
        marker.style.pointerEvents = 'auto';
        marker.style.display = 'block';

        let left = 50, top = 50;

        if (this.currentFloor === 2) {
            // Coordinate mapping for 2nd Floor
            // X: [-10, 14], Z: [-22, 6]
            const minX = -12, maxX = 16;
            const minZ = -22, maxZ = 8;
            left = ((this.player.position.x - minX) / (maxX - minX)) * 100;
            top = ((this.player.position.z - minZ) / (maxZ - minZ)) * 100;
        } else {
            // Coordinate mapping for 1st Floor (Offset X: 100)
            const oX = 100;
            const minX = oX - 10, maxX = oX + 16;
            const minZ = -12, maxZ = 12;
            left = ((this.player.position.x - minX) / (maxX - minX)) * 100;
            top = ((this.player.position.z - minZ) / (maxZ - minZ)) * 100;
        }

        marker.style.left = `${left}%`;
        marker.style.top = `${top}%`;
    }

    // setSceneBrightnessを呼び出す
    adjustBrightness(factor) {
        this.setSceneBrightness(factor);
    }

    setSceneBrightness(factor) {
        this.sceneBrightness = factor;
        this.applyBrightness();
    }

    applyBrightness() {
        const totalFactor = this.userBrightness * this.sceneBrightness;

        this.allLights.forEach(lightData => {
            lightData.light.intensity = lightData.baseIntensity * totalFactor;
        });

        // 現在のループ数に応じたベースカラーを決定
        let baseColorHex = 0x050505;
        if (this.currentFloor === "FLAT_WORLD") {
            baseColorHex = 0x000000;
        } else if (this.loopCount === 3) {
            baseColorHex = 0x1a0505; // 赤黒いチェイス
        } else if (this.loopCount === 4) {
            baseColorHex = 0x0a0a14; // 青白い記憶
        } else if (this.loopCount === 5) {
            baseColorHex = 0x330000; // 崩壊した赤黒
        } else if (this.loopCount >= 6) {
            baseColorHex = 0x111111; // クライマックス
        }

        const c = new THREE.Color(baseColorHex).multiplyScalar(totalFactor);
        this.scene.background = c;
        if (this.scene.fog) {
            this.scene.fog.color = c;
        }
    }

    addLight(light, baseIntensity, persistent = false) {
        if (persistent) {
            this.scene.add(light);
        } else {
            this.mapRoot.add(light);
        }
        this.allLights.push({ light, baseIntensity });
        this.applyBrightness(); // 追加したライトにも即座に適用
        return light;
    }

    startIntro() {
        this.gameState = 'INTRO';
        const introScreen = document.getElementById('intro-screen');
        const introText = document.getElementById('intro-text');

        introScreen.style.display = 'flex';
        introText.style.opacity = '0'; // reset opacity
        introText.innerText = "夜中にふと目が覚めてトイレに行こうとした、\nでもなんだか体が重くて、あたまがふわふわして、\n世界が変な感じがする。";

        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        this.introTimeouts.push(setTimeout(() => {
            introText.style.opacity = '1';
        }, 500));

        // Auto-skip after some time
        this.introTimeouts.push(setTimeout(() => {
            this.skipIntro();
        }, 8000));

        // Click to skip
        introScreen.onclick = () => this.skipIntro();
    }

    skipIntro() {
        if (this.gameState !== 'INTRO') return;
        const introScreen = document.getElementById('intro-screen');
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];
        introScreen.style.opacity = '0';
        setTimeout(() => {
            introScreen.style.display = 'none';
            // Only start if we're still in INTRO state to avoid double-starting
            if (this.gameState === 'INTRO') this.startGame();
        }, 500);
    }

    addProgress(eventId) {
        if (!this.completedEvents.has(eventId)) {
            this.completedEvents.add(eventId);

            if (eventId === 'talk_sister') {
                // 妹に話しかけた瞬間にピッタリ100%にする
                this.progress = 100.000;
            } else {
                this.progress += 0.031;
                // エンディング前は 100% を超えないようにストッパーをかける
                if (this.progress > 99.999) {
                    this.progress = 99.999;
                }
            }
            this.updateProgressUI();
        }
    }

    updateProgressUI() {
        document.getElementById('progress-text').innerText = `${this.progress.toFixed(3)}%`;
        const el = document.getElementById('progress-text');
        el.style.color = '#fff';
        setTimeout(() => el.style.color = '#60a5fa', 300);
    }

    startGame() {
        this.gameState = 'PLAYING';
        this.setSceneBrightness(2.0); // Initial brightness boost
        document.getElementById('objective-overlay').style.display = 'block';
        document.getElementById('icon-bar').style.display = 'flex';
        document.getElementById('instructions').style.display = 'block';
        this.updateObjective("部屋の扉を開ける方法を探す");

        this.soundAssets.ambient.play().catch(e => console.log("Audio play blocked", e));

        // 演出：ぼやけた視界から目覚める
        this.applyWakeUpEffect();

        // 開始直後の独白を追加
        this.showDialogue('……あたまが、重い。寝ぼけてるのかな。', () => {
            this.showDialogue('とりあえず、トイレに行こう……。');
        });
    }

    createFader() {
        let fader = document.getElementById('screen-fader');
        if (!fader) {
            fader = document.createElement('div');
            fader.id = 'screen-fader';
            fader.style.position = 'absolute';
            fader.style.top = '0';
            fader.style.left = '0';
            fader.style.width = '100vw';
            fader.style.height = '100vh';
            fader.style.backgroundColor = '#000';
            fader.style.opacity = '0';
            fader.style.transition = 'opacity 0.5s ease-in-out';
            fader.style.zIndex = '9000'; // Stay behind dialogue (10001) but above mapping
            fader.style.pointerEvents = 'none';
            document.body.appendChild(fader);
        }
        return fader;
    }

    setupFlatWorld() {
        this.currentFloor = "FLAT_WORLD";
        this.loopCount = 999;
        this.mapRoot.clear();
        this.interactables = [];
        this.collisionObjects1F = [];
        this.collisionObjects2F = [];
        this.collisionLines1F = [];
        this.flatWorldHouseGroup = null;

        // Generate Endless Plane
        const planeGeo = new THREE.PlaneGeometry(1000, 1000, 50, 50);
        const planeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.2 });
        const flatWorld = new THREE.Mesh(planeGeo, planeMat);
        flatWorld.rotation.x = -Math.PI / 2;
        flatWorld.position.y = -10;
        this.mapRoot.add(flatWorld);
        this.flatWorldMat = planeMat;

        this.scene.background = new THREE.Color(0x000000);
        if (this.scene.fog) {
            this.scene.fog.color.setHex(0x000000);
            this.scene.fog.density = 0.015;
        }

        this.player.position.set(0, -10, 0);
        this.camera.position.set(0, -6, 6);

        // Spawn Poro
        this.setupPoro();
    }

    setupPoro() {
        if (this.poro) this.scene.remove(this.poro);

        // Simple voxel dog (Poro)
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 0.4);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xfffcf0 }); // Cream white
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.25;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.35);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0.45, 0.5, 0);
        group.add(head);

        const noseGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
        const noseMat = new THREE.MeshLambertMaterial({ color: 0x332211 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0.65, 0.5, 0);
        group.add(nose);

        const tailGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(-0.4, 0.5, 0);
        tail.rotation.z = -0.5;
        group.add(tail);

        group.position.set(3, -9.8, 0);
        group.scale.set(0.6, 0.6, 0.6); // Retain small size
        this.scene.add(group);
        this.poro = group;
        this.poroState = 'IDLE';

        this.interactables.push({
            obj: group,
            name: 'PORO',
            x: group.position.x,
            z: group.position.z
        });
    }

    updatePoro() {
        if (!this.poro) return;

        if (this.poroState === 'RUNAWAY') {
            const speed = 0.15;
            this.poro.position.x += this.poroRunDirection.x * speed;
            this.poro.position.z += this.poroRunDirection.z * speed;
            this.poro.rotation.y = -Math.atan2(this.poroRunDirection.z, this.poroRunDirection.x);

            const dx = this.player.position.x - this.poro.position.x;
            const dz = this.player.position.z - this.poro.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 35) { // Off screen
                this.poroState = 'GONE';
                this.scene.remove(this.poro);

                this.showDialogue('……あれ。どこかに行っちゃった。', () => {
                    setTimeout(() => {
                        this.showDialogue('…………？ 何か足音が聞こえる', () => {
                            this.playPoroSwarmEvent();
                        });
                    }, 500);
                });
            }
        }

        // Sync the interactable's stored position so proximity detection keeps working
        const poroEntry = this.interactables.find(i => i.name === 'PORO');
        if (poroEntry && this.poro) {
            poroEntry.x = this.poro.position.x;
            poroEntry.z = this.poro.position.z;
        }
    }

    goToFirstFloor() {
        const fader = this.createFader();
        fader.style.opacity = '1';
        this.gameState = 'FADING';

        setTimeout(() => {
            this.currentFloor = 1;
            // Update map view if it was open
            if (this.gameState === 'MAP_VIEW') {
                this.mapViewFloor = 1;
                this.renderMap();
            }

            const oX = 100;
            this.player.position.set(oX, -10, 8); // spawn at bottom of stairs (STAIRS_UP is at Z=9.9)
            this.player.rotation.y = Math.PI; // Face north

            // Snap camera
            this.camera.position.set(this.player.position.x, this.player.position.y + 6, this.player.position.z + 6);

            setTimeout(() => {
                fader.style.opacity = '0';
                this.adjustBrightness(2.0); // Boosted brightness for 1st Floor
                this.gameState = 'PLAYING';
            }, 500);
        }, 1000);
    }

    goToSecondFloor() {
        const fader = this.createFader();
        fader.style.opacity = '1';
        this.gameState = 'FADING';

        setTimeout(() => {
            this.currentFloor = 2;
            // Update map view if it was open
            if (this.gameState === 'MAP_VIEW') {
                this.mapViewFloor = 2;
                this.renderMap();
            }

            if (this.hasOpenedParentsBox && !this.is2FLeftRoomTrapped) {
                this.is2FLeftRoomTrapArmed = true; this.doorL2F.position.z = -14.5; // Make door look wide open
            }

            this.player.position.set(0, 0, -18); // top of stairs
            this.player.rotation.y = 0; // face south

            // Snap camera
            this.camera.position.set(this.player.position.x, this.player.position.y + 6, this.player.position.z + 6);

            setTimeout(() => {
                fader.style.opacity = '0';
                this.setSceneBrightness(2.0); // Major brightness boost for 2nd Floor
                this.gameState = 'PLAYING';
            }, 500);
        }, 1000);
    }

    loopToStart() {
        if (this.swarmAnim) clearInterval(this.swarmAnim); // ★追加：チェイスタイマーを確実に消す

        this.hasSeenBlockers = false;
        this.hasSeenStairsWatcher = false;
        this.loop4_blockers = [];

        const fader = this.createFader();
        fader.style.opacity = '1';
        this.gameState = 'FADING';

        setTimeout(() => {
            this.loopCount++; // Increment loop count on restart
            this.triggerGlitch(800);
            this.currentFloor = 2;
            this.player.position.set(0, 0, 0);
            this.player.rotation.set(0, 0, 0);
            this.camera.position.set(0, 6, 6);
            this.camera.lookAt(this.player.position);

            // Rebuild the map to apply architectural changes (like Loop 3 corridor)
            this.refreshMapForLoop();

            // Reset Audio
            if (this.soundAssets.chase) {
                this.soundAssets.chase.pause();
                this.soundAssets.chase.currentTime = 0;
            }
            if (this.soundAssets.heavy_footsteps) {
                this.soundAssets.heavy_footsteps.pause();
                this.soundAssets.heavy_footsteps.currentTime = 0;
            }

            // ★周回ごとに環境音を制御する
            if (this.soundAssets.ambient) this.soundAssets.ambient.pause();
            if (this.soundAssets.rain) this.soundAssets.rain.pause();

            if (this.loopCount === 5) {
                // 5周目：激しい雨の音（カオスな世界）
                if (this.soundAssets.rain) {
                    this.soundAssets.rain.currentTime = 0;
                    this.soundAssets.rain.play().catch(e => { });
                }
            } else if (this.loopCount >= 6) {
                // 6周目：完全な無音（テキスト通り、ノイズも消える）
                // 何も再生しない
            } else {
                // 1〜4周目：通常の環境音
                if (this.soundAssets.ambient) {
                    this.soundAssets.ambient.play().catch(e => { });
                }
            }

            // Map sync
            if (this.gameState === 'MAP_VIEW') {
                this.mapViewFloor = 2;
                this.renderMap();
            }

            // ループごとに霧の濃さを通常(0.05)にリセット
            if (this.scene.fog) {
                this.scene.fog.density = 0.05;
            }

            // Apply specific loop environmental changes
            this.applyLoopState();

            // 演出：ぼやけた視界から目覚める
            this.applyWakeUpEffect();

            setTimeout(() => {
                fader.style.opacity = '0';
                this.setSceneBrightness(2.0); // Major brightness boost for 2nd Floor

                if (this.loopCount === 3) {
                    this.updateObjective('……部屋から出る？'); // あえて不穏な目的にする
                    this.showDialogue('……また僕の部屋だ。やっぱり何かおかしい。', () => {
                        if (this.soundAssets.slap) {
                            this.soundAssets.slap.currentTime = 0;
                            this.soundAssets.slap.play().catch(e => { });
                        }
                        setTimeout(() => {
                            if (this.soundAssets.slap) {
                                this.soundAssets.slap.currentTime = 0;
                                this.soundAssets.slap.play().catch(e => { });
                            }
                            this.showDialogue('（パンッ、パンッ）……痛っ。夢じゃないの？…でも、絶対におかしい…どうすればいいんだろう。');
                        }, 400);
                    });
                } else if (this.loopCount === 4) {
                    this.updateObjective('静かな家を歩く');
                    this.showDialogue('……はぁ、はぁっ…。', () => {
                        this.showDialogue('……！やっ、やっぱりそうだ！<br>ここはいつもの世界じゃないんだ！', () => {
                            this.showDialogue('なんだったんだ、さっきの化け物は…！', () => {
                                this.showDialogue('…どうしたら、ここから抜け出すことができるんだよ…！');
                            });
                        });
                    });
                } else if (this.loopCount === 5) {
                    this.updateObjective('歪んだ世界で、あの子を探す');
                    this.showDialogue('……また、この部屋だ。でも……何かが違う。', () => {
                        this.showDialogue('さっきの真っ暗な場所で聞こえた声……あれは…', () => {
                            this.showDialogue('部屋中から、ひどく強い雨の匂いがする……。', () => {
                                this.showDialogue('……胸が苦しい。この崩壊した赤黒い世界は、もしかして……', () => {
                                    this.showDialogue('生まれてこれなかった『あの子』の、ずっと抑え込んでいた悲しみそのものなの……？');
                                });
                            });
                        });
                    });
                } else if (this.loopCount >= 6) {
                    this.updateObjective('あの子に会いにいく');
                    this.showDialogue('……静かだ。さっきまでの不気味なノイズも、雨の匂いも消えている。', () => {
                        this.showDialogue('あの時、僕を守ってくれたのは……お姉ちゃんと、ポロ？', () => {
                            this.showDialogue('いや……違う。お姉ちゃんは、あんな姿じゃない。', () => {
                                this.showDialogue('『きっと、お兄ちゃんをいっぱい驚かせるような、いたずらっ子になるんだろうな』', () => {
                                    this.showDialogue('……絵の裏に書かれていた、お姉ちゃんの言葉。', () => {
                                        this.showDialogue('僕を追いかけ回して、そして最後には僕を守ってくれた「あの怪物」の正体が……やっと分かった。', () => {
                                            this.showDialogue('……ごめんね。ずっと気づかなくて。', () => {
                                                this.showDialogue('待ってて。今、ちゃんと会いに行くからね。');
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else if (this.loopCount === 2) {
                    this.updateObjective('また、ここから……？ 違和感を探す');
                    this.showDialogue('……あれ？', () => {
                        this.showDialogue('僕の部屋……？ さっきのは夢だったのかな？');
                    });
                } else {
                    this.updateObjective('部屋の扉を開ける方法を探す');
                    this.showDialogue('……？ 僕の部屋……？ さっきのは夢だったのかな？');
                }
            }, 800);
        }, 2000);
    }

    refreshMapForLoop() {
        console.log(`[Map] Refreshing map for Loop ${this.loopCount}`);

        // Clear all meshes in mapRoot
        this.mapRoot.clear();

        // 常時配置されているメインライト2つだけを残してリストをリセット（重複増殖バグを防止）
        this.allLights = this.allLights.filter(l => l.light === this.ambientLight || l.light === this.pointLight);

        // Reset interactables and collision
        this.interactables = [];
        this.collisionObjects1F = [];
        this.collisionObjects2F = [];
        this.collisionLines1F = []; // 斜めの壁用

        // Rebuild both floors
        this.createMap(); // Rebuilds 2F and calls buildFirstFloor()
    }

    applyWakeUpEffect() {
        const canvas = this.renderer.domElement;
        if (!canvas) return;

        // 初期状態：強いぼかしと暗さ
        canvas.style.transition = 'none';
        canvas.style.filter = 'blur(20px) brightness(0.4)';

        // DOMの更新を待ってからアニメーション開始
        requestAnimationFrame(() => {
            canvas.style.transition = 'filter 4.0s ease-out';
            canvas.style.filter = 'blur(0px) brightness(1.0)';
        });

        // アニメーション完了後にスタイルをクリア（他のエフェクトへの干渉防止）
        setTimeout(() => {
            if (canvas.style.filter === 'blur(0px) brightness(1)') {
                canvas.style.transition = '';
                canvas.style.filter = '';
            }
        }, 4000);
    }

    applyLoopState() {
        if (this.loopCount >= 2) {
            // Loop 2+ Feature: Narrative flags
            this.hasLeftRoomKey = true;
            this.isLeftRoomOpen = true;
            this.isRightRoomOpen = true;
            this.isSisterDoorOpen = true;
            this.isDoorOpen = true;
            this.hasOpenedParentsBox = true;
            this.canExitHouse = false;
            this.isSisterDoorOpen = true;

            // 演出：2F左の部屋の家具を浮遊させる
            if (this.loopCount < 6) {
                if (this.mapTable) this.mapTable.isFloating = true;
                if (this.lrChair) {
                    this.lrChair.isFloating = true;
                    this.lrChair.rotation.z = 0.2;
                }
                if (this.lrCabinet) {
                    this.lrCabinet.isFloating = true;
                    this.lrCabinet.rotation.x = 0.1;
                }
            }

            // Spawn Puzzles for Loop 2
            this.spawnLoop2Items();
        }

        if (this.loopCount >= 3) {
            // Loop 3: Nightmare / Chase Phase
            if (this.scene.fog) this.scene.fog.density = 0.08;

            // BGM Switch - Only chase in Loop 3
            if (this.loopCount === 3) {
                if (this.soundAssets.ambient) {
                    this.soundAssets.ambient.pause();
                }
                if (this.soundAssets.chase) {
                    this.soundAssets.chase.currentTime = 0;
                    this.soundAssets.chase.play().catch(e => { });
                }
            } else {
                if (this.soundAssets.chase) {
                    this.soundAssets.chase.pause();
                }
                if (this.soundAssets.heavy_footsteps) {
                    this.soundAssets.heavy_footsteps.pause();
                    this.soundAssets.heavy_footsteps.currentTime = 0;
                }
                if (this.loopCount < 5 && this.soundAssets.ambient && this.soundAssets.ambient.paused) {
                    this.soundAssets.ambient.play().catch(e => { });
                }
            }

            // Reset 1F cinematic flag for corridor chase
            this.loop3_1f_cinematic_triggered = false;

            // Spawn the Nightmare - Only in Loop 3
            if (this.loopCount === 3) {
                this.spawnMonster();
            } else {
                // Ensure monster is removed if NOT in Loop 3
                if (this.monster) {
                    this.scene.remove(this.monster);
                    this.monster = null;
                }
            }
            this.spawnLoop3Items();
        }

        if (this.loopCount === 4) {
            // 第4周：姉の部屋をロックし、リビングの記憶を最初から配置する
            this.isSisterDoorOpen = false;
            if (this.doorR) {
                this.doorR.position.z = -13; // 扉を物理的に閉じる
            }
            this.spawnLivingMemory(); // リビングに光の玉を配置

            // 影の最初の配置
            setTimeout(() => this.spawnSisterShadow(0, -17.5, 'SHADOW_STAIRS'), 1000);
        }

        if (this.loopCount === 5) {
            // Loop 5: Chaos Distortions (赤黒い崩壊世界)
            if (this.scene.fog) this.scene.fog.density = 0.12;
            this.setSceneBrightness(2.0);

            // 家具を浮かせて傾けるための便利関数（Y座標の足し算を削除しました）
            const floatFurniture = (obj, rotX, rotY, rotZ) => {
                if (obj) {
                    if (rotX) obj.rotation.x = rotX;
                    if (rotY) obj.rotation.y = rotY;
                    if (rotZ) obj.rotation.z = rotZ;
                    obj.isFloating = true; // 上下運動アニメーションをON
                }
            };

            // 主人公の部屋の家具を浮かせる
            floatFurniture(this.bed, 0.2, 0.1, 0.4);      // ベッド
            floatFurniture(this.deskBoy, -0.3, 0.5, 0.2); // 机
            floatFurniture(this.chairBoy, 0.6, 0, 0.5);   // 椅子
            floatFurniture(this.toyBox, 0.4, -0.2, 0.1);  // おもちゃ箱

            // 姉の部屋の家具を浮かせる
            floatFurniture(this.sisterBed, 0.3, 0, -0.2);
            floatFurniture(this.sideTableSister, -0.2, 0.4, 0.3);

            // 廊下・左部屋の家具を浮かせる
            floatFurniture(this.mapTable, -0.3, 0.2, 0);
            floatFurniture(this.lrChair, 0.2, -0.5, 0.4);
            if (this.lrCabinet) floatFurniture(this.lrCabinet, 0.1, 0, 0);
        }

        if (this.loopCount >= 6) {
            // Loop 6 (旧5): 薄暗い雰囲気のみ（壁・床は非表示にしない）
            if (this.scene.fog) this.scene.fog.density = 0.1;

            // --- Loop 6 Finale: 1F 親の部屋に妹を配置 (oX=100) ---
            const oX = 100;
            const finalP = { x: oX + 5, z: -8 };
            const loader = new THREE.TextureLoader();
            const tex = loader.load('./images/sister.png');
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
            const sisterEntity = new THREE.Sprite(mat);
            sisterEntity.scale.set(1.4, 2, 1);
            sisterEntity.position.set(finalP.x, -9.0, finalP.z);
            this.mapRoot.add(sisterEntity);
            this.interactables.push({ obj: sisterEntity, name: 'FINAL_SISTER', x: finalP.x, z: finalP.z });

            this.collisionObjects1F.push([finalP.x - 0.4, finalP.x + 0.4, finalP.z - 0.4, finalP.z + 0.4]);

            this.updateObjective('あの子に会いにいく', 100.000);
        }
        this.applyBrightness();
    }

    spawnLivingMemory() {
        const oXL = 100;
        const memoryLight = new THREE.PointLight(0x60a5fa, 1.2, 12);
        memoryLight.position.set(oXL + 11, -8.5, 2);
        this.mapRoot.add(memoryLight);

        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8 });
        const memorySphere = new THREE.Mesh(sphereGeo, sphereMat);
        memorySphere.position.copy(memoryLight.position);
        memorySphere.isFloating = true;
        memorySphere.originalY = memorySphere.position.y;
        this.mapRoot.add(memorySphere);

        this.interactables.push({ obj: memorySphere, name: 'LOOP4_LIVING_MEMORY', x: oXL + 11, z: 2 });

        const loader = new THREE.TextureLoader();
        loader.load('./images/creepy_entity.png', (tex) => {
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: 0x111111 }); // 真っ黒にする
            const positions = [
                { x: oXL + 11.5, z: 2.5 },
                { x: oXL + 10.5, z: 2.5 },
                { x: oXL + 11, z: 1.2 }
            ];
            positions.forEach(pos => {
                const s = new THREE.Sprite(mat.clone());
                s.scale.set(2, 3, 1);
                s.position.set(pos.x, -8.5, pos.z);
                this.mapRoot.add(s);
                this.loop4_blockers.push(s);
            });
        });
    }

    checkLoop4Memories() {
        if (this.loop4_memory_count >= 2) {
            this.updateObjective('2階から聞こえた物音を確かめる');
            setTimeout(() => {
                if (this.soundAssets.door_open) {
                    this.soundAssets.door_open.currentTime = 0;
                    this.soundAssets.door_open.play().catch(e => { });
                }
                this.triggerGlitch(400);
                this.showDialogue('（ガチャッ……）<br>……！ 2階の方から、扉が開く音がした。お姉ちゃんの部屋……？', () => {
                    this.isSisterDoorOpen = true;
                    if (this.doorR) this.doorR.position.z = -15.5; // 扉を物理的に開ける
                });
            }, 1000);
        } else {
            this.updateObjective('記憶を辿る (' + this.loop4_memory_count + '/2)');
        }
    }

    spawnLoop2Items() {
        if (this.loopCount < 2) return;

        const keypadMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            emissive: 0x003300,
            roughness: 0.5
        });
        const oX = 100;

        // --- 1F: Entrance Keypad ---
        if (!this.loop2_puzzles.entrance && !this.interactables.some(it => it.name === 'LOOP2_ENTRANCE_KEYPAD')) {
            const keypadE = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.3), keypadMat);
            keypadE.position.set(oX + 1.75, -8.2, -9.0);
            this.mapRoot.add(keypadE);
            this.interactables.push({ obj: keypadE, name: 'LOOP2_ENTRANCE_KEYPAD', x: oX + 1.75, z: -9.0 });

            const lightE = new THREE.PointLight(0x44ff44, 0.4, 2);
            lightE.position.set(oX + 1.6, -8.2, -9.0);
            this.mapRoot.add(lightE);
        }

        // --- 2F: Room Keypad ---
        // 玄関を解いた後、かつまだ部屋にパズルがない場合のみ生成
        if (this.loop2_puzzles.entrance && !this.loop2_puzzles.room && !this.interactables.some(it => it.name === 'LOOP2_ROOM_KEYPAD')) {
            const keypadR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.4), keypadMat);
            keypadR.position.set(5.0, 0.1, 0.0);
            this.mapRoot.add(keypadR);
            this.interactables.push({ obj: keypadR, name: 'LOOP2_ROOM_KEYPAD', x: 5.0, z: 0.0 });

            const lightR = new THREE.PointLight(0x44ff44, 0.4, 2);
            lightR.position.set(5.0, 0.4, 0.0);
            this.mapRoot.add(lightR);
        }

        // --- 2F: Left Room Father's Memo ---
        if (!this.interactables.some(it => it.name === 'FATHER_MEMO')) {
            const fMemoGeo = new THREE.BoxGeometry(0.4, 0.02, 0.5);
            const fMemoMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            const fatherMemo = new THREE.Mesh(fMemoGeo, fMemoMat);
            fatherMemo.position.set(-7.0, 0.05, -12.0);
            this.mapRoot.add(fatherMemo);
            this.interactables.push({ obj: fatherMemo, name: 'FATHER_MEMO', x: -7.0, z: -12.0 });
        }

        // --- 1F: Poro's Collar ---
        if (!this.interactables.some(it => it.name === 'PORO_COLLAR')) {
            const collarGeo = new THREE.TorusGeometry(0.3, 0.06, 8, 24);
            const collarMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
            const collar = new THREE.Mesh(collarGeo, collarMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(oX, -9.9, 2);
            this.mapRoot.add(collar);
            this.interactables.push({ obj: collar, name: 'PORO_COLLAR', x: oX, z: 2 });
        }
    }

    spawnLoop3Items() {
        if (this.loopCount !== 3) return;

        // --- 2F: Loop 3 Hint Memo (Ken-ken-pa) ---
        const memoGeo = new THREE.BoxGeometry(0.4, 0.02, 0.5);
        const memoMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const loop3Memo = new THREE.Mesh(memoGeo, memoMat);
        loop3Memo.position.set(0, 0.05, -17.5); // Just before stairs (stairs are at Z:-19.5, boy's room door at Z:-13)
        this.mapRoot.add(loop3Memo);
        this.interactables.push({ obj: loop3Memo, name: 'LOOP3_MEMO', x: 0, z: -17.5 });
    }

    showSlidingPuzzle(onSuccess) {
        this.gameState = 'UI_OPEN';
        // 追加：足音停止とキーリセット
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets && this.soundAssets.footstep) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        const overlay = document.getElementById('sliding-puzzle-overlay');
        const grid = document.getElementById('sliding-grid');
        grid.innerHTML = '';
        overlay.style.display = 'flex';

        // 3x3 picture in the center of a 5x5 grid
        // Center indices:
        // 6,  7,  8
        // 11, 12, 13
        // 16, 17, 18
        const targetPos = [6, 7, 8, 11, 12, 13, 16, 17, 18];

        this.board = Array(25).fill(null);
        this.puzzlePieces = targetPos.map((pos, i) => ({
            id: i, tPos: pos, cPos: pos, isFixed: false
        }));

        this.puzzlePieces.forEach((p, i) => {
            p.cPos = p.tPos;
            // 最初に数個固定してしまうと簡単になりすぎるため、今回は固定解除か中央だけ固定
            if (i === 4) p.isFixed = true; // Center piece (index 12 in board) is fixed as anchor
            this.board[p.cPos] = p;
        });

        this.puzzleCursorIndex = 12; // Start in middle
        this.puzzleIsGrabbing = false;

        const getAdj = (idx) => {
            const r = Math.floor(idx / 5), c = idx % 5;
            const a = [];
            if (r > 0) a.push(idx - 5); if (r < 4) a.push(idx + 5);
            if (c > 0) a.push(idx - 1); if (c < 4) a.push(idx + 1);
            return a;
        };

        const swap = (from, to) => {
            const p = this.board[from];
            this.board[to] = p;
            this.board[from] = null;
            if (p) p.cPos = to;
        };

        // Shuffle
        for (let i = 0; i < 200; i++) {
            const empty = [];
            for (let j = 0; j < 25; j++) if (!this.board[j]) empty.push(j);
            const eIdx = empty[Math.floor(Math.random() * empty.length)];
            const adj = getAdj(eIdx).filter(n => this.board[n] && !this.board[n].isFixed);
            if (adj.length > 0) {
                const from = adj[Math.floor(Math.random() * adj.length)];
                swap(from, eIdx);
            }
        }

        const render = () => {
            grid.innerHTML = '';
            this.board.forEach((p, i) => {
                const cell = document.createElement('div');
                cell.className = 'sliding-tile' + (p ? '' : ' empty');
                if (p && p.isFixed) cell.classList.add('fixed');

                if (i === this.puzzleCursorIndex) {
                    cell.classList.add(this.puzzleIsGrabbing ? 'grabbed' : 'cursor');
                }

                if (p) {
                    const icon = document.createElement('div');
                    icon.className = 'icon';

                    const r = Math.floor(p.tPos / 5) - 1;
                    const c = (p.tPos % 5) - 1;
                    icon.style.backgroundImage = "url('./images/poro.png')";
                    icon.style.backgroundSize = "300px 300px";
                    icon.style.backgroundPosition = `-${c * 100}px -${r * 100}px`;

                    cell.appendChild(icon);
                }

                cell.onclick = () => {
                    if (p && p.isFixed) return;
                    if (this.puzzleIsGrabbing && i === this.puzzleCursorIndex) {
                        // Drop in place (deselect)
                        this.puzzleIsGrabbing = false;
                    } else if (this.puzzleIsGrabbing && !p) {
                        // Move grabbed piece to this empty cell
                        swap(this.puzzleCursorIndex, i);
                        this.puzzleCursorIndex = i;
                        this.puzzleIsGrabbing = false;
                    } else {
                        this.puzzleCursorIndex = i;
                        this.puzzleIsGrabbing = !!p;
                    }
                    render();
                };
                grid.appendChild(cell);
            });
        };

        const handlePuzzleKey = (e) => {
            const r = Math.floor(this.puzzleCursorIndex / 5);
            const c = this.puzzleCursorIndex % 5;

            if (this.puzzleIsGrabbing) {
                let targetIdx = -1;
                if (e.key === 'ArrowUp' || e.key === 'w') { if (r > 0) targetIdx = this.puzzleCursorIndex - 5; }
                else if (e.key === 'ArrowDown' || e.key === 's') { if (r < 4) targetIdx = this.puzzleCursorIndex + 5; }
                else if (e.key === 'ArrowLeft' || e.key === 'a') { if (c > 0) targetIdx = this.puzzleCursorIndex - 1; }
                else if (e.key === 'ArrowRight' || e.key === 'd') { if (c < 4) targetIdx = this.puzzleCursorIndex + 1; }
                else if (e.key === ' ' || e.key === 'Enter') this.puzzleIsGrabbing = false;

                if (targetIdx !== -1 && !this.board[targetIdx]) {
                    swap(this.puzzleCursorIndex, targetIdx);
                    this.puzzleCursorIndex = targetIdx;
                    this.puzzleIsGrabbing = false;
                    // checkWin() はrender()内で呼ばれる
                }
            } else {
                if (e.key === 'ArrowUp' || e.key === 'w') { if (r > 0) this.puzzleCursorIndex -= 5; }
                else if (e.key === 'ArrowDown' || e.key === 's') { if (r < 4) this.puzzleCursorIndex += 5; }
                else if (e.key === 'ArrowLeft' || e.key === 'a') { if (c > 0) this.puzzleCursorIndex -= 1; }
                else if (e.key === 'ArrowRight' || e.key === 'd') { if (c < 4) this.puzzleCursorIndex += 1; }
                else if (e.key === ' ' || e.key === 'Enter') {
                    if (this.board[this.puzzleCursorIndex] && !this.board[this.puzzleCursorIndex].isFixed) {
                        this.puzzleIsGrabbing = true;
                    }
                }
            }
            render();
            if (e.key !== 'F12') { e.preventDefault(); e.stopPropagation(); }
        };

        window.addEventListener('keydown', handlePuzzleKey);

        const checkWin = () => {
            const targetMap = {};
            this.puzzlePieces.forEach(p => {
                targetMap[p.tPos] = { id: p.id };
            });

            let mismatches = [];
            let isWin = true;

            Object.keys(targetMap).forEach(pos => {
                const idx = parseInt(pos);
                const piece = this.board[idx];
                const target = targetMap[idx];

                if (!piece || piece.id !== target.id) {
                    isWin = false;
                    mismatches.push({
                        index: idx,
                        row: Math.floor(idx / 5),
                        col: idx % 5,
                        expected: target.id,
                        got: piece ? piece.id : 'empty'
                    });
                }
            });

            if (isWin) {
                // クリア成功
                console.log("Puzzle Solved!");
                grid.classList.add('puzzle-solved');
                // ★追加：パズルクリア音を再生する
                if (this.soundAssets.puzzle_clear) {
                    this.soundAssets.puzzle_clear.currentTime = 0;
                    this.soundAssets.puzzle_clear.play().catch(e => { });
                }
                window.removeEventListener('keydown', handlePuzzleKey);
                const checkBtn = document.getElementById('sliding-puzzle-check-btn');
                if (checkBtn) checkBtn.disabled = true;
                setTimeout(() => {
                    overlay.style.display = 'none';
                    this.gameState = 'PLAYING';
                    if (onSuccess) onSuccess();
                }, 1000);
            } else {
                // 不正解の理由をデバッグ出力
                console.warn("Puzzle mismatch at:", mismatches);

                // 不正解フラッシュ
                const checkBtn = document.getElementById('sliding-puzzle-check-btn');
                if (checkBtn) {
                    checkBtn.style.borderColor = '#ff4444';
                    checkBtn.style.color = '#ff4444';
                    checkBtn.textContent = '×';
                    setTimeout(() => {
                        checkBtn.style.borderColor = '';
                        checkBtn.style.color = '';
                        checkBtn.textContent = '〇';
                    }, 600);
                }
            }
        };

        render();

        // 〇ボタン：押したときにクリア判定
        const checkBtn = document.getElementById('sliding-puzzle-check-btn');
        checkBtn.onclick = () => {
            checkWin();
        };

        const closeBtn = document.getElementById('sliding-puzzle-close-btn');
        closeBtn.onclick = () => {
            window.removeEventListener('keydown', handlePuzzleKey);
            overlay.style.display = 'none';
            this.gameState = 'PLAYING';
        };
    }

    showKeypadPuzzle(title, code, onSuccess) {
        this.gameState = 'UI_OPEN';
        // 追加：足音停止とキーリセット
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets && this.soundAssets.footstep) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        this.currentPuzzleCode = code;
        this.onPuzzleSuccess = onSuccess;

        document.getElementById('puzzle-title').textContent = title;
        document.getElementById('keypad-display').textContent = '----';
        document.getElementById('puzzle-overlay').style.display = 'flex';
    }

    checkPuzzleCode(entered) {
        if (entered === this.currentPuzzleCode) {
            // Success
            const display = document.getElementById('keypad-display');
            display.style.color = '#fff';
            display.textContent = 'OPEN';

            // 解除音とドスン音を再生
            if (this.soundAssets.keypad_unlock) this.soundAssets.keypad_unlock.play();
            if (this.soundAssets.thud) {
                setTimeout(() => this.soundAssets.thud.play(), 200);
            }

            setTimeout(() => {
                document.getElementById('puzzle-overlay').style.display = 'none';
                this.gameState = 'PLAYING';
                if (this.onPuzzleSuccess) this.onPuzzleSuccess();
            }, 800);
        } else {
            // Fail
            const display = document.getElementById('keypad-display');
            display.style.color = '#f00';
            setTimeout(() => {
                display.style.color = '#0f0';
                display.textContent = '----';
            }, 500);
        }
    }

    showDialogue(text, callback = null) {
        this.gameState = 'DIALOGUE';
        const box = document.getElementById('dialogue-box');
        const textElem = document.getElementById('dialogue-text');
        box.style.display = 'block';
        textElem.innerHTML = text;

        // 移動キーを全てリセット（テキスト表示中に歩行音が鳴り続けないようにする）
        this.keys = { w: false, a: false, s: false, d: false, space: false };

        // 足音を即時停止
        if (this.soundAssets && this.soundAssets.footstep && !this.soundAssets.footstep.paused) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        this.dialogueCloseCallback = callback;
    }

    showChoices(text, choices) {
        this.gameState = 'DIALOGUE_CHOICE';
        this.currentChoices = choices;
        this.selectedChoiceIndex = 0;

        // 移動キーを全てリセット＆足音停止
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets && this.soundAssets.footstep && !this.soundAssets.footstep.paused) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        const box = document.getElementById('dialogue-box');
        const textElem = document.getElementById('dialogue-text');
        const choiceContainer = document.getElementById('choice-container');
        const prompt = document.getElementById('dialogue-prompt');

        box.style.display = 'block';
        textElem.innerHTML = text;
        prompt.style.display = 'none'; // hide SPACE prompt

        choiceContainer.innerHTML = '';
        choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            if (idx === 0) btn.classList.add('selected');
            btn.innerText = choice.text;
            btn.onmouseenter = () => this.changeChoiceSelection(0, idx);
            btn.onclick = (e) => {
                if (e) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                this.executeChoice(idx);
            };
            choiceContainer.appendChild(btn);
        });

        choiceContainer.style.display = 'flex';
        this.keys.space = false;
    }

    changeChoiceSelection(dir, exactIndex = null) {
        if (!this.currentChoices) return;
        const btns = document.querySelectorAll('.choice-btn');
        if (btns.length === 0) return;

        btns[this.selectedChoiceIndex].classList.remove('selected');

        if (exactIndex !== null) {
            this.selectedChoiceIndex = exactIndex;
        } else {
            this.selectedChoiceIndex += dir;
            if (this.selectedChoiceIndex < 0) this.selectedChoiceIndex = this.currentChoices.length - 1;
            if (this.selectedChoiceIndex >= this.currentChoices.length) this.selectedChoiceIndex = 0;
        }

        btns[this.selectedChoiceIndex].classList.add('selected');
    }

    executeChoice(index) {
        if (!this.currentChoices || !this.currentChoices[index]) return;
        this.lastChoiceTime = Date.now(); // 入力時間を記録

        const choiceContainer = document.getElementById('choice-container');
        const prompt = document.getElementById('dialogue-prompt');
        choiceContainer.style.display = 'none';
        prompt.style.display = 'block';

        const action = this.currentChoices[index].action;
        this.currentChoices = null; // Clear choices

        if (action) action();
    }

    closeDialogue() {
        this.lastDialogueCloseTime = Date.now(); // 閉じた時間を記録
        document.getElementById('dialogue-box').style.display = 'none';

        // 演出中ならEVENTに戻し、そうでないならPLAYINGに戻す
        if (this.isCinematicPlaying) {
            this.gameState = 'EVENT';
        } else {
            this.gameState = 'PLAYING';
        }

        this.keys.space = false;
        if (this.dialogueCloseCallback) {
            const cb = this.dialogueCloseCallback;
            this.dialogueCloseCallback = null;
            cb();
        }
    }

    updateObjective(text, ignoredProgress) {
        if (!text || text.trim() === '') {
            document.getElementById('objective-text').innerText = '';
        } else {
            document.getElementById('objective-text').innerText = `現在の目的：${text}`;
        }
        // 進捗の更新は addProgress に一任するため、ここではUIのフラッシュのみ行う
        const el = document.getElementById('progress-text');
        el.style.color = '#fff';
        setTimeout(() => el.style.color = '#60a5fa', 300);
    }

    showEnding() {
        this.gameState = 'EVENT';

        // UIを隠す
        document.getElementById('ui-container').style.display = 'none';
        document.getElementById('interact-notice').style.display = 'none';

        const fader = this.createFader();
        fader.style.backgroundColor = 'white';
        fader.style.transition = 'opacity 5s ease-in-out';

        this.triggerGlitch(1500);

        setTimeout(() => {
            fader.style.opacity = '1';

            if (this.soundAssets.chase) this.soundAssets.chase.pause();
            if (this.soundAssets.ambient) this.soundAssets.ambient.pause();

            setTimeout(() => {
                const endingText = document.createElement('div');
                endingText.id = 'ending-text';
                endingText.style.position = 'fixed';
                endingText.style.top = '50%';
                endingText.style.left = '50%';
                endingText.style.transform = 'translate(-50%, -50%)';
                endingText.style.color = 'black';
                endingText.style.fontFamily = 'serif';
                endingText.style.fontSize = '2.5rem';
                endingText.style.textAlign = 'center';
                endingText.style.zIndex = '30000';
                endingText.style.opacity = '0';
                endingText.style.transition = 'opacity-transition 3s ease-in-out';
                endingText.innerHTML = '100.000%<br><br>……おやすみなさい、お姉ちゃん。';
                document.body.appendChild(endingText);

                // Allow a tiny reflow
                setTimeout(() => {
                    endingText.style.opacity = '1';
                }, 100);
            }, 5000);
        }, 100);
    }

    setupLights() {
        this.pointLight = new THREE.PointLight(0xffeedd, 2.2, 25);
        this.pointLight.position.set(0, 4, 0);
        this.pointLight.castShadow = true;

        // 1周目から2周目と同等の明るさになるよう、強度を2倍(1.8→3.6, 4.5→9.0)に設定
        this.ambientLight = new THREE.AmbientLight(0x404050, 3.6);
        this.scene.add(this.ambientLight);
        this.scene.add(this.pointLight);

        this.allLights.push({ light: this.ambientLight, baseIntensity: 3.6 });
        this.allLights.push({ light: this.pointLight, baseIntensity: 9.0 });
    }

    createMap() {
        // --- CRITICAL RULE: NEVER ADD SOUTH WALL MESHES (Z+) TO THE SCENE ---
        // South walls must only exist as collision boundaries. mapRoot.add(southWall) will block the camera.
        const floorSize = 12;

        // Texture generation
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillRect(64, 64, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(floorSize / 2, floorSize / 2);

        const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });

        // Main Room Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize, 12, 12), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.mapRoot.add(floor);

        // Hallway Floor z: -6 to -20
        const hallZ = 14;
        const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(4, hallZ, 4, 14), floorMat);
        hallFloor.rotation.x = -Math.PI / 2;
        hallFloor.position.set(0, 0, -floorSize / 2 - hallZ / 2);
        hallFloor.receiveShadow = true;
        this.mapRoot.add(hallFloor);

        // Sister's Room Floor
        const sisterFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12, 12, 12), floorMat);
        sisterFloor.rotation.x = -Math.PI / 2;
        sisterFloor.position.set(8, 0, -13);
        sisterFloor.receiveShadow = true;
        this.mapRoot.add(sisterFloor);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x151515 });

        // Room North walls (left and right of the door)
        const wallN1 = new THREE.Mesh(new THREE.BoxGeometry(5.25, 5, 0.5), wallMat);
        wallN1.position.set(-3.375, 2.5, -6);
        this.mapRoot.add(wallN1);

        const wallN2 = new THREE.Mesh(new THREE.BoxGeometry(5.25, 5, 0.5), wallMat);
        wallN2.position.set(3.375, 2.5, -6);
        this.mapRoot.add(wallN2);

        // Room West and East
        const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, floorSize), wallMat);
        wallW.position.set(-floorSize / 2, 2.5, 0);
        this.mapRoot.add(wallW);

        const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, floorSize), wallMat);
        wallE.position.set(floorSize / 2, 2.5, 0);
        this.mapRoot.add(wallE);

        // Hallway Walls
        const hwL1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6.25), wallMat);
        hwL1.position.set(-2, 2.5, -16.875);
        this.mapRoot.add(hwL1);

        const hwL2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6.25), wallMat);
        hwL2.position.set(-2, 2.5, -9.125);
        this.mapRoot.add(hwL2);

        // Right hallway wall has a gap for the door
        const hwR1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6.25), wallMat);
        hwR1.position.set(2, 2.5, -16.875);
        this.mapRoot.add(hwR1);

        const hwR2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6.25), wallMat);
        hwR2.position.set(2, 2.5, -9.125);
        this.mapRoot.add(hwR2);

        // Sister's Room Walls
        const srN = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.5), wallMat);
        srN.position.set(8, 2.5, -19);
        this.mapRoot.add(srN);

        // South wall (srS) is removed visually so it does not block the camera
        // Collision is still maintained in checkCollision

        const srE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 12), wallMat);
        srE.position.set(14, 2.5, -13);
        this.mapRoot.add(srE);

        // --- Interactable Objects ---
        this.door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        this.door.position.set(0, 1.75, -5.9);
        if (this.loopCount >= 2) this.door.position.x = -2.0; // Open from start
        this.mapRoot.add(this.door);
        this.interactables.push({ obj: this.door, name: 'DOOR', x: 0, z: -5.9 });

        const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 4), new THREE.MeshStandardMaterial({ color: 0x112233 }));
        bed.position.set(-3.5, 0.3, 2);
        bed.castShadow = true;
        this.mapRoot.add(bed);
        this.interactables.push({ obj: bed, name: 'BED', x: -3.5, z: 2 });
        this.bed = bed;

        // Dresser (Boy's Room)
        const dresserBoy = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0x221105 }));
        dresserBoy.position.set(4.5, 1, -4.5);
        dresserBoy.castShadow = true;
        this.mapRoot.add(dresserBoy);
        this.interactables.push({ obj: dresserBoy, name: 'DRESSER_BOY', x: 4.5, z: -4.5 });
        this.dresserBoy = dresserBoy;

        // NEW: Desk and Chair for Boy
        const deskBoy = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x2a1a0a }));
        deskBoy.position.set(2.5, 0.4, -5.3);
        deskBoy.castShadow = true;
        this.mapRoot.add(deskBoy);
        this.interactables.push({ obj: deskBoy, name: 'DESK_BOY', x: 2.5, z: -5.3 });
        this.deskBoy = deskBoy;

        const chairBoy = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a0a05 }));
        chairBoy.position.set(2.5, 0.4, -3.8);
        chairBoy.castShadow = true;
        this.mapRoot.add(chairBoy);
        this.chairBoy = chairBoy;

        // NEW: Bookshelf for Boy
        const bookshelfBoy = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 2.5), new THREE.MeshStandardMaterial({ color: 0x221105 }));
        bookshelfBoy.position.set(-5.5, 1.25, -3);
        bookshelfBoy.castShadow = true;
        this.mapRoot.add(bookshelfBoy);
        this.interactables.push({ obj: bookshelfBoy, name: 'BOOKSHELF_BOY', x: -5.5, z: -3 });
        this.bookshelfBoy = bookshelfBoy;

        // NEW: Toy Box
        const toyBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.2), new THREE.MeshStandardMaterial({ color: 0x0a2a0a }));
        toyBox.position.set(-4.5, 0.35, -4.5);
        toyBox.castShadow = true;
        this.mapRoot.add(toyBox);
        this.interactables.push({ obj: toyBox, name: 'TOY_BOX', x: -4.5, z: -4.5 });
        this.toyBox = toyBox;

        // Hallway Doors
        const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        doorL.position.set(-1.8, 1.75, -13);
        if (this.loopCount >= 2) doorL.position.z = -15.5; // Open from start
        this.mapRoot.add(doorL);
        this.interactables.push({ obj: doorL, name: 'DOOR_L', x: -1.8, z: -13 });
        this.doorL2F = doorL; // Save reference for trap

        // --- 2F Left Room Bounds (8 wide x 6 deep: X:-2~-10, Z:-10~-16) ---
        const lrFloor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), floorMat);
        lrFloor.rotation.x = -Math.PI / 2;
        lrFloor.position.set(-6, 0, -13);
        this.mapRoot.add(lrFloor);

        const lrN = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.5), wallMat);
        lrN.position.set(-6, 2.5, -16);
        this.mapRoot.add(lrN);

        // lrS (south wall) is not added to the scene per camera rule - collision only

        const lrW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6), wallMat);
        lrW.position.set(-10, 2.5, -13);
        this.mapRoot.add(lrW);

        // 2F Map Item (Always table, only map mesh if not picked up)
        const mapTable = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.9 }));
        mapTable.position.set(-8.5, 0.4, -14.5);
        this.mapRoot.add(mapTable);
        this.mapTable = mapTable; // Reference for floating

        const lrChair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a0a05 }));
        lrChair.position.set(-7.5, 0.4, -13);
        lrChair.rotation.y = 0.5;
        this.mapRoot.add(lrChair);
        this.lrChair = lrChair; // Reference for floating

        const lrCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x221105 }));
        lrCabinet.position.set(-8.5, 0.6, -15.5); // Against the north wall
        this.mapRoot.add(lrCabinet);
        this.lrCabinet = lrCabinet;

        // ▼ 1周目の時だけ調べられるようにする
        if (this.loopCount < 2) {
            this.interactables.push({ obj: lrCabinet, name: 'CABINET_LR', x: -8.5, z: -15.5 });
        }

        if (!this.hasHouseMap) {
            const mapGeo = new THREE.PlaneGeometry(0.6, 0.4);
            const mapMat = new THREE.MeshBasicMaterial({ color: 0xddddaa, side: THREE.DoubleSide });
            this.mapMesh = new THREE.Mesh(mapGeo, mapMat);
            this.mapMesh.rotation.x = -Math.PI / 2;
            this.mapMesh.position.set(-8.5, 0.81, -14.5); // Top of the table
            this.mapRoot.add(this.mapMesh);
            this.interactables.push({ obj: this.mapMesh, name: 'HOUSE_MAP', x: -8.5, z: -14.5 });
        }

        // Right Sister Door
        this.doorR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        this.doorR.position.set(1.8, 1.75, -13);
        if (this.loopCount >= 2) this.doorR.position.z = -15.5; // Open from start
        this.mapRoot.add(this.doorR);
        this.interactables.push({ obj: this.doorR, name: 'DOOR_R', x: 1.8, z: -13 });

        // Stairs at end of hall
        const stairs = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        stairs.position.set(0, 0, -19.5);
        this.mapRoot.add(stairs);
        this.interactables.push({ obj: stairs, name: 'STAIRS', x: 0, z: -19.5 });

        const voidMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        voidMesh.position.set(0, 2.5, -21);
        this.mapRoot.add(voidMesh);

        if (this.loopCount < 3) {
            const loader = new THREE.TextureLoader();
            loader.load('./images/creepy_entity.png', (tex) => {
                const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, opacity: 0.25, color: 0x111111 });
                this.stairsWatcher = new THREE.Sprite(mat);
                this.stairsWatcher.scale.set(3, 4, 1);
                this.stairsWatcher.position.set(0, 1.4, -20.6); // 暗闇の手前
                this.mapRoot.add(this.stairsWatcher);
            });
        }

        // --- Sister's Room Furniture ---
        const sisterBed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 4), new THREE.MeshStandardMaterial({ color: 0x331122 }));
        sisterBed.position.set(10, 0.3, -10);
        sisterBed.castShadow = true;
        this.mapRoot.add(sisterBed);
        this.interactables.push({ obj: sisterBed, name: 'BED_SISTER', x: 10, z: -10 });
        this.sisterBed = sisterBed;

        const dresserSister = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a1a2a }));
        dresserSister.position.set(4.0, 1, -17.5);
        dresserSister.castShadow = true;
        this.mapRoot.add(dresserSister);
        this.interactables.push({ obj: dresserSister, name: 'DRESSER_SISTER', x: 4.0, z: -17.5 });
        this.dresserSister = dresserSister;

        // NEW: Vanity for Sister
        const vanitySister = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x3a2a3a }));
        vanitySister.position.set(13.5, 1.1, -14);
        vanitySister.castShadow = true;
        this.mapRoot.add(vanitySister);
        this.interactables.push({ obj: vanitySister, name: 'VANITY_SISTER', x: 13.5, z: -14 });
        this.vanitySister = vanitySister;

        // NEW: Side Table
        const sideTableSister = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
        sideTableSister.position.set(12.5, 0.4, -10);
        sideTableSister.castShadow = true;
        this.mapRoot.add(sideTableSister);
        this.interactables.push({ obj: sideTableSister, name: 'SIDE_TABLE_SISTER', x: 12.5, z: -10 });
        this.sideTableSister = sideTableSister;

        // NEW: Rug
        const rugSister = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshStandardMaterial({ color: 0x442233, roughness: 1 }));
        rugSister.position.set(8, 0.01, -14);
        rugSister.rotation.x = -Math.PI / 2;
        this.mapRoot.add(rugSister);
        this.rugSister = rugSister;

        // NEW: Bookshelf for Sister
        const bookshelfSister = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a1a05 }));
        bookshelfSister.position.set(8, 1.25, -18.6);
        bookshelfSister.castShadow = true;
        this.mapRoot.add(bookshelfSister);
        this.interactables.push({ obj: bookshelfSister, name: 'BOOKSHELF_SISTER', x: 8, z: -18.6 });
        this.bookshelfSister = bookshelfSister;

        // Sister's Diary (Only if not already picked up)
        if (!this.hasSisterDiary) {
            const diaryGeo = new THREE.BoxGeometry(0.3, 0.05, 0.4);
            const diaryMat = new THREE.MeshBasicMaterial({ color: 0xffaaaa });
            const diary = new THREE.Mesh(diaryGeo, diaryMat);
            diary.position.set(7.0, 0.05, -8.5);
            this.mapRoot.add(diary);
            this.interactables.push({ obj: diary, name: 'SISTER_DIARY', x: 7.0, z: -8.5 });
        }

        // Sister's Photo Item
        const photoGeo = new THREE.PlaneGeometry(0.5, 0.7);
        const photoMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.DoubleSide });
        const photoMesh = new THREE.Mesh(photoGeo, photoMat);
        photoMesh.rotation.x = -Math.PI / 2;

        let photoX = 13.5;
        let photoZ = -18.5; // Default: Corner of the sister's room

        if (this.loopCount >= 6) {
            photoX = 0;
            photoZ = -17.5; // In front of the stairs
        }

        photoMesh.position.set(photoX, 0.01, photoZ);
        this.mapRoot.add(photoMesh);
        this.interactables.push({ obj: photoMesh, name: 'SISTER_PHOTO', x: photoX, z: photoZ });

        // Pre-build 1st floor meshes and collision (invisible until teleport)
        this.buildFirstFloor();
    }

    createPlayer() {
        this.player = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        this.player.add(body);

        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.4;
        head.castShadow = true;
        this.player.add(head);

        this.scene.add(this.player);
        this.player.position.set(0, 0, 0);

        this.playerLight = new THREE.PointLight(0xaaaaff, 1.5, 12);
        this.playerLight.position.set(0, 1.5, 0);
        this.player.add(this.playerLight);
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();

            // During cinematic event, block regular play input (except dialogue)
            if (this.isCinematicPlaying && this.gameState !== 'DIALOGUE' && this.gameState !== 'DIALOGUE_CHOICE') return;

            if (this.gameState === 'DIALOGUE_CHOICE') {
                if (k === 'w' || k === 'arrowup') {
                    e.preventDefault();
                    this.changeChoiceSelection(-1);
                    return;
                }
                if (k === 's' || k === 'arrowdown') {
                    e.preventDefault();
                    this.changeChoiceSelection(1);
                    return;
                }
                if (k === ' ' || k === 'enter') {
                    e.preventDefault();
                    this.executeChoice(this.selectedChoiceIndex);
                    return;
                }
            }

            if (k === 'w' || k === 'arrowup') this.keys.w = true;
            if (k === 'a' || k === 'arrowleft') this.keys.a = true;
            if (k === 's' || k === 'arrowdown') this.keys.s = true;
            if (k === 'd' || k === 'arrowright') this.keys.d = true;

            // Map shortcut
            if (k === 'm' && this.hasHouseMap) {
                if (this.gameState === 'MAP_VIEW') this.closeMap();
                else if (this.gameState === 'PLAYING') this.showMap();
            }
            // Keypad Support
            if (this.gameState === 'UI_OPEN' && document.getElementById('puzzle-overlay').style.display === 'flex') {
                if (/^[0-9]$/.test(k)) {
                    this.handleKeypadInput(k);
                    return;
                }
                if (k === 'backspace') {
                    this.handleKeypadInput('CLEAR');
                    return;
                }
                if (k === 'escape') {
                    this.closeKeypad();
                    return;
                }
            }

            if (k === ' ') {
                e.preventDefault(); // Prevent scrolling/clicking when pressing SPACE
                if (!this.keys.space) {
                    this.keys.space = true;
                    this.onSpacePressed();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') this.keys.w = false;
            if (k === 'a' || k === 'arrowleft') this.keys.a = false;
            if (k === 's' || k === 'arrowdown') this.keys.s = false;
            if (k === 'd' || k === 'arrowright') this.keys.d = false;
            if (k === ' ') this.keys.space = false;
        });

        // Add global click listener for advancing UI
        window.addEventListener('click', (e) => {
            // Ignore clicks if a UI element was clicked (to prevent bubbling issues)
            if (e.target.tagName === 'BUTTON' ||
                e.target.closest('.choice-btn') ||
                e.target.closest('.keypad-btn') ||
                e.target.closest('.ui-icon') ||
                e.target.closest('.inventory-item')) {
                return;
            }

            // テンキーパズルの外側をクリックしたら閉じる
            const keypadOverlay = document.getElementById('puzzle-overlay');
            if (keypadOverlay && keypadOverlay.style.display === 'flex') {
                if (!e.target.closest('#puzzle-overlay')) {
                    this.closeKeypad();
                }
                return;
            }

            // スライディングパズルの外側をクリックしたら閉じる
            const slidingOverlay = document.getElementById('sliding-puzzle-overlay');
            if (slidingOverlay && slidingOverlay.style.display === 'flex') {
                if (!e.target.closest('#sliding-puzzle-overlay')) {
                    const closeBtn = document.getElementById('sliding-puzzle-close-btn');
                    if (closeBtn) closeBtn.click();
                }
                return;
            }

            this.onSpacePressed();
        });
    }

    onSpacePressed() {
        // 重複入力防止：選択肢を選んだ直後は入力を無視
        if (Date.now() - this.lastChoiceTime < 100) return;

        console.log(`[Input] Advance Pressed. GameState: ${this.gameState}`);

        if (this.gameState === 'INTRO') {
            this.skipIntro();
            return;
        }

        if (this.gameState === 'DIALOGUE_CHOICE') {
            return; // Only clickable buttons advance dialogue choice
        }

        if (this.gameState === 'PHOTO_VIEW') {
            this.closePhotoView();
            return;
        }
        if (this.gameState === 'MAP_VIEW') {
            this.closeMap();
            return;
        }
        if (this.gameState === 'UI_OPEN') {
            if (document.getElementById('sliding-puzzle-overlay').style.display === 'flex') return;
            if (document.getElementById('puzzle-overlay').style.display === 'flex') return;
            this.toggleInventory(false);
            return;
        }

        if (this.gameState === 'EVENT') {
            return; // Block all SPACE input during cinematic
        }

        if (this.gameState === 'DIALOGUE') {
            this.closeDialogue();
            return;
        }

        if (this.gameState === 'PLAYING') {
            // ダイアログを閉じた直後（300ms以内）は、同じ入力で再インタラクトしないようにガード
            if (Date.now() - this.lastDialogueCloseTime < 300) return;

            const notice = document.getElementById('interact-notice');
            if (notice.style.opacity === '1' && this.nearestTarget) {
                this.handleInteraction(this.nearestTarget);
            }
        }
    }

    handleInteraction(target) {
        if (target.name === 'BED') {
            if (this.loopCount >= 5) {
                this.showDialogue('このベッドで、何度夢を見ただろう。<br>……あの子も、夢の中でここに来ていたのかな。');
            } else if (!this.inventory.find(i => i.id === 'KEY_BOY')) {
                this.showDialogue('……ベッドの下に、何か落ちてる。これは……鍵？ なんでこんなところに鍵があるんだろう。', () => {
                    this.inventory.push({
                        id: 'KEY_BOY', name: '金属の鍵', icon: '🔑', action: () => {
                            this.showDialogue('古びた鉄の鍵だ。どこかの扉を開けられそうだ。');
                        }
                    });
                    this.addProgress('get_boy_key');
                    this.soundAssets.item_get.currentTime = 0;
                    this.soundAssets.item_get.play().catch(e => { });
                    // 「暗い廊下へ」だと先走り感があるので変更
                    this.updateObjective('鍵を使って、扉を開ける');
                });
            } else {
                this.showDialogue('ベッドの下には、もう何もない。');
            }
        }
        else if (target.name === 'BED_SISTER') {
            if (this.loopCount >= 6) {
                this.showDialogue('お姉ちゃんのベッド……。<br>この夢で見せられていたのは、ずっと家に隠されていた『本当の記憶』なんだね。');
            } else if (this.loopCount === 5) {
                this.showDialogue('お姉ちゃんのベッドが、……浮いてる。<br>雨の匂いが、ここからもする……。');
            } else {
                this.showDialogue('お姉ちゃんのベッドだ。お姉ちゃんはいない。');
            }
        }
        else if (target.name === 'DRESSER_BOY') {
            if (this.loopCount >= 5) {
                this.showDialogue('僕の服。<br>……着替えるたびに、お母さんが畳んでくれてた。あの頃は当たり前だったのに。');
            } else {
                this.showDialogue('僕の着替えが入っている。');
            }
        }
        else if (target.name === 'DRESSER_SISTER') {
            if (this.loopCount >= 5) {
                this.showDialogue('お姉ちゃんの服。<br>……あの子に着せてあげたかった服が、どこかにあったんだろうか。');
            } else {
                this.showDialogue('お姉ちゃんの服が入っている。');
            }
        }
        else if (target.name === 'DESK_BOY') {
            this.showDialogue('……宿題、まだ終わってないんだっけ。今はそんなことしてる場合じゃないけど。');
        }
        else if (target.name === 'BOOKSHELF_BOY') {
            this.showDialogue('図鑑や、冒険小説が並んでる。……今は、どれも読む気になれない。');
        }
        else if (target.name === 'TOY_BOX') {
            this.showDialogue('……最近、おもちゃで遊んでない気がする。なんだか、ずっと前から大人だったような……変な感じ。');
        }
        else if (target.name === 'VANITY_SISTER') {
            this.showDialogue('お姉ちゃんの服が入っている。');
        }
        else if (target.name === 'SIDE_TABLE_SISTER') {
            this.showDialogue('小さなテーブル。何も置いていない。');
        }
        else if (target.name === 'BOOKSHELF_SISTER') {
            this.showDialogue('難しい本がたくさん並んでる。');
        }
        else if (target.name === 'CABINET_LR') {
            this.showDialogue('書類や古い文房具が入っている。');
        }
        else if (target.name === 'HOUSE_MAP') {
            this.addProgress('get_map');
            this.showDialogue('机の上に、紙切れが置いてある。<br>……家の地図？なんでこんなのが…？<br><span style="color:#60a5fa;">【見取り図】を手に入れた。</span>', () => {
                this.inventory.push({
                    id: 'MAP_HOUSE', name: '見取り図', icon: '🗺️', action: () => {
                        this.showMap();
                    }
                });
                this.soundAssets.item_get.currentTime = 0;
                this.soundAssets.item_get.play().catch(e => { });
                this.hasHouseMap = true;
                if (this.mapMesh) {
                    this.mapRoot.remove(this.mapMesh);
                }
                this.interactables = this.interactables.filter(i => i.name !== 'HOUSE_MAP');

                // Trigger trap
                this.is2FLeftRoomTrapArmed = false;
                this.is2FLeftRoomTrapped = true;
                this.doorL2F.position.z = -13; // Force slam door
                this.soundAssets.door_open.currentTime = 0;
                this.soundAssets.door_open.play().catch(e => { });
                this.updateObjective('閉じ込められた！');
            });
        }
        else if (target.name === 'DOOR') {
            if (this.isDoorOpen) {
                this.showDialogue('扉は開いている。廊下へ出られる。');
            } else if (!this.inventory.find(i => i.id === 'KEY_BOY')) {
                this.showDialogue('……あれ。扉が、開かない？<br>鍵なんてかけたっけ……。');
                this.triggerGlitch(100);
            } else {
                this.showDialogue('見つけた【鍵】を使った。<br>カチャリと音がして、重たい扉がゆっくりと奥へ開いた。', () => {
                    this.openDoorSequence();
                });
            }
        }
        else if (target.name === 'DOOR_1F_L') {
            if (this.isLeftRoomOpen) {
                this.showDialogue('扉は開いている。……奥は物置かな。');
                return;
            }
            if (this.inventory.find(i => i.id === 'KEY_1F_L')) {
                this.showDialogue('……冷蔵庫で見つけた鍵が合った。<br>（ガチャッ）……開いた。', () => {
                    this.openLeftRoom();
                });
            } else {
                this.showDialogue('扉は閉まっている。鍵がかかっているみたいだ。');
            }
        }

        else if (target.name === 'DOOR_1F_R') {
            if (this.isRightRoomOpen) {
                this.showDialogue('扉は開いている。お父さんとお母さんの部屋だ。');
            } else {
                this.showDialogue('お父さんとお母さんの部屋の扉だ。<br>鍵がかかっていて開かないようだ。');
            }
        }

        else if (target.name === 'FRIDGE') {
            if (this.loopCount >= 6) {
                this.showDialogue('冷蔵庫。<br>……この悪夢の中で、何度もここを開けた気がする。<br>氷みたいに冷たい空気が、ずっとあの悲しい世界と繋がっていたんだな。');
                return;
            }
            if (this.loopCount === 5) {
                if (!this.loop4_fridge_checked) {
                    this.showChoices('冷蔵庫の奥に、不自然な赤いボタンがある。', [
                        {
                            text: '押す', action: () => {
                                this.addProgress('push_fridge_btn');
                                this.loop4_fridge_checked = true;
                                this.soundAssets.toilet.play();
                                this.triggerGlitch(500);
                                this.showDialogue('「ゴゴゴ……」と家全体が低く唸るような嫌な音がした。', () => {
                                    // 古いマップを完全に消去してから再生成し、浮遊状態などを再適用する
                                    this.refreshMapForLoop();
                                    this.applyLoopState();
                                });
                            }
                        },
                        {
                            text: '押さない', action: () => {
                                this.showDialogue('今はやめておこう…。');
                            }
                        }
                    ]);
                } else {
                    this.showDialogue('もうボタンは押した。冷たい空気が流れ出ているだけだ。');
                }
            } else if (!this.inventory.find(i => i.id === 'KEY_1F_L')) {
                this.showDialogue('冷たい空気が流れ出てくる……。奥の方に、古い鍵が落ちている。<br>……なんでこんなところに？ とりあえず、持っておこう。', () => {
                    this.addProgress('get_fridge_key');
                    this.inventory.push({
                        id: 'KEY_1F_L', name: '勝手口の鍵', icon: '🗝️', action: () => {
                            this.showDialogue('一階のどこかの部屋の鍵だろうか。');
                        }
                    });
                    this.soundAssets.item_get.currentTime = 0;
                    this.soundAssets.item_get.play().catch(e => { });
                    this.updateObjective('新しい部屋を探索する');

                    const itBtn = document.getElementById('items-btn');
                    itBtn.style.background = 'rgba(100, 20, 20, 0.8)';
                    setTimeout(() => itBtn.style.background = '', 500);
                });
            } else {
                this.showDialogue('冷蔵庫の中にはもう何もない。');
            }
        }
        else if (target.name === 'LOOP4_TOILET_BUTTON') {
            this.loop4_toilet_button_count++;
            const c = this.loop4_toilet_button_count;

            // 「いいえ」を押した時の共通リセット処理
            const cancelAction = () => {
                this.loop4_toilet_button_count = 0; // カウントを最初に戻す
                this.closeDialogue();
            };

            if (c === 1) {
                this.showChoices('壁に何かのボタンがある。押しますか？', [
                    { text: 'はい', action: () => { this.handleInteraction(target); } },
                    { text: 'いいえ', action: cancelAction }
                ]);
            } else if (c === 2) {
                this.showChoices('……本当に押しますか？', [
                    { text: 'はい', action: () => { this.handleInteraction(target); } },
                    { text: 'いいえ', action: cancelAction }
                ]);
            } else if (c === 3) {
                this.showChoices('本+当に押#し%ますか？', [
                    { text: 'は$い', action: () => { this.handleInteraction(target); } },
                    { text: 'い!いえ', action: cancelAction } // 修正
                ]);
            } else if (c === 4) {
                this.showChoices('本当に...押%し%ま*すか？', [
                    { text: 'は!!い', action: () => { this.handleInteraction(target); } },
                    { text: 'いい?え', action: cancelAction } // 修正
                ]);
            } else if (c === 5) {
                this.triggerGlitch(200);
                this.showChoices('#本&+$当に@押!し_ます>?か？', [
                    { text: 'hはい@', action: () => { this.handleInteraction(target); } },
                    { text: '!wいi%え', action: cancelAction } // 修正
                ]);
            } else if (c >= 6) {
                this.scene.background = new THREE.Color(0xaa0000);
                if (this.scene.fog) this.scene.fog.color.setHex(0xaa0000);
                document.body.classList.add('giant-glitch-ui');
                this.triggerGlitch(800);

                const teleportOut = () => {
                    this.addProgress('warp_flat_world');
                    this.loop4_toilet_button_count = 0; // 念のためリセット
                    this.closeDialogue();
                    document.body.classList.remove('giant-glitch-ui');
                    const fader = this.createFader();
                    fader.style.opacity = '1';
                    this.gameState = 'FADING';

                    if (this.soundAssets.chase) this.soundAssets.chase.pause();

                    setTimeout(() => {
                        this.setupFlatWorld();

                        setTimeout(() => {
                            fader.style.opacity = '0';
                            this.gameState = 'PLAYING';
                            this.showDialogue('……！？な、なんだここ…？<br>何もない…');
                            this.updateObjective('ただ歩き続ける', 100.000);
                        }, 800);
                    }, 1500);
                };

                this.showChoices('!!!!!!!!!!!', [
                    { text: 'はい', action: teleportOut },
                    { text: 'はい', action: teleportOut }
                ]);
            }
        }
        else if (target.name === 'FINAL_SISTER') {
            this.addProgress('talk_sister');
            this.showDialogue('「……そこにいたんだね。」', () => {
                this.showDialogue('「ごめん。僕、知らなかったんだ。君のこと……。」', () => {
                    this.showDialogue('「生まれてこれなかった、僕の妹。」', () => {
                        this.showDialogue('「お姉ちゃんが描いた、あの絵の中に……君はいたんだね。」', () => {
                            this.showDialogue('「ずっと暗い場所にいて、……寂しくて、苦しかったんだね。」', () => {
                                this.showDialogue('「お姉ちゃんが絵に描いた通りだ……君は本当に、ひどい『いたずらっ子』だね。」', () => {
                                    this.showDialogue('「ただ……僕やお姉ちゃんと一緒に、鬼ごっこがしたかっただけなんだね。」', () => {
                                        this.showDialogue('「寂しかったよね。ずっと独りで、こんな暗いところに……。」', () => {

                                            // 会話終了後、少し間を置いてエンディング演出へ移行
                                            setTimeout(() => {
                                                this.triggerEnding();
                                            }, 1000);

                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
        else if (target.name === 'STAIRS') {
            if (this.loopCount >= 6) {
                this.showDialogue('この階段……何度も降りた。<br>でも今日が、本当の意味で最後かもしれない。', () => {
                    this.showDialogue('……行かなきゃ。あの子のところへ。', () => {
                        this.goToFirstFloor();
                    });
                });
            } else if (this.loopCount === 3) {
                this.showChoices('……なんだか、すごく嫌な予感がする。下りないほうがいい気がする……。', [
                    {
                        text: '降りる',
                        action: () => {
                            this.closeDialogue();
                            if (this.soundAssets.heartbeat) {
                                this.soundAssets.heartbeat.currentTime = 0;
                                this.soundAssets.heartbeat.play().catch(e => { });
                            }
                            this.goToFirstFloor();
                        }
                    },
                    {
                        text: 'やめておく',
                        action: () => {
                            this.showDialogue('……今はやめておこう。', () => {
                                this.closeDialogue();
                            });
                        }
                    }
                ]);
            } else if (this.hasCheckedSisterDiary && this.hasCheckedPhoto) {
                this.showDialogue('体が少し軽くなった。<br>暗い階段を降りれそうだ。', () => {
                    this.goToFirstFloor();
                });
            } else if (!this.hasCheckedStairs) {
                this.addProgress('check_stairs_1');
                this.hasCheckedStairs = true;
                this.showDialogue('なぜか足が重くて降りれない…<br>一階にトイレがあるのに。', () => {
                    this.updateObjective("なにかがおかしい。一階へ行くべき？");
                    setTimeout(() => this.triggerSisterEvent(), 6000);
                });
            } else {
                this.showDialogue('……まだ、ここで降りる時じゃない気がする。');
            }
        }
        else if (target.name === 'TOILET') {
            if (this.loopCount >= 6) {
                this.showDialogue('トイレの扉。<br>……夜中に目が覚めてここに来ようとした時から、ずっと長い夢を見ている。', () => {
                    this.showDialogue('あの子が、僕を呼んだのかもしれない。<br>……ありがとう。気づかせてくれて。');
                });
                return;
            }
            if (this.hasOpenedParentsBox) {
                this.showDialogue('トイレだ。<br>……あれ？ 行きたかったはずなのに、なんだかもう出そうにないや。……それに、中にいたはずの気配も、もう消えていた。');
                return;
            }
            this.showChoices('トイレの扉だ。鍵がかかっていて開かない。<br>……もしかして、お姉ちゃんが入ってる？', [
                {
                    text: '扉を叩く',
                    action: () => {
                        this.closeDialogue();
                        this.soundAssets.knock.currentTime = 0;
                        this.soundAssets.knock.play();

                        this.triggerGlitch(200);
                        setTimeout(() => {
                            this.showDialogue('（コンコン）<br>……中からも「コンコン」とノックが返ってきた。<br>お姉ちゃんが中にいるんだ。');
                        }, 800);
                    }
                },
                {
                    text: '出てくるまで待つ',
                    action: () => {
                        this.closeDialogue();
                        this.showDialogue('……いつまで経っても出てこない。<br>しばらく待とう。');
                    }
                }
            ]);
        }
        else if (target.name === 'PARENTS_BOX') {
            console.log(`[Interaction] PARENTS_BOX (Loop: ${this.loopCount}, Opened: ${this.hasOpenedParentsBox})`);

            if (this.loopCount === 4 && !this.loop4_memories.parents_room) {
                this.addProgress('memory_parents');
                this.loop4_memories.parents_room = true;
                this.loop4_memory_count++;
                this.showDialogue('部屋の真ん中に、古い箱が置かれている。', () => {
                    this.showDialogue('中には、一度も使われることのなかった小さなベビー服がしまわれている。', () => {
                        this.showDialogue('……誰のために用意したんだろう。ずっと捨てられずにいたみたいだ。', () => {
                            this.triggerGlitch(200);
                            this.checkLoop4Memories();
                        });
                    });
                });
                return; // 4周目はこのイベントだけで終わらせる
            }

            if (this.loopCount >= 6) {
                this.showDialogue('……。', () => {
                    this.showDialogue('中には、あの子のために用意されていたベビー服…なのかな。', () => {
                        this.showDialogue('お父さんも、お母さんも、この箱を見るたびに胸を痛めていたんだろうか。<br>……ごめんね。僕たちが、ちゃんと向き合えていれば……。');
                    });
                });
            } else if (this.hasOpenedParentsBox) {
                if (target.obj && target.obj.material) {
                    target.obj.material.color.set(0x555555);
                }
                this.showDialogue('箱は開いている。中にはベビー服と、小さなおもちゃが並んでいた。');
            } else {
                this.showDialogue('……古びた箱が置かれている。', () => {
                    this.showChoices('開けてみますか？', [
                        {
                            text: '開ける',
                            action: () => {
                                this.addProgress('open_box_1');

                                if (target.obj && target.obj.material) {
                                    target.obj.material.color.set(0x555555);
                                }

                                // setTimeout(待ち時間) を消して、即座に次の文章を表示する
                                this.showDialogue('……箱の中には、古いベビー服と小さなおもちゃが丁寧にしまわれていた。<br>誰のものだろう？', () => {
                                    this.hasOpenedParentsBox = true;

                                    if (this.soundAssets && this.soundAssets.knock) {
                                        this.soundAssets.knock.currentTime = 0;
                                        this.soundAssets.knock.play().catch(e => { });
                                    }
                                    this.showDialogue('（ドンドンドン！）<br>……！？ 2階から大きな物音がした！');
                                    this.updateObjective('二階からの大きな物音……戻るべき？');
                                });
                            }
                        },
                        {
                            text: 'そのままにしておく',
                            action: () => {
                                this.closeDialogue();
                            }
                        }
                    ]);
                });
            }
        }
        else if (target.name === 'DOOR_L') {
            if (this.is2FLeftRoomTrapped) {
                this.showDialogue('扉が開かない…！ …？何か足音が…？', () => {
                    this.playCinematicEvent();
                });
            } else if (this.is2FLeftRoomTrapArmed || this.is2FEscapeReady || this.loopCount >= 2) {
                this.showDialogue('扉は開いている。中に入れそうだ。');
            } else {
                this.showDialogue('鍵がかかっている。<br>固く閉ざされていて開かないようだ。');
            }
        }
        else if (target.name === 'DOOR_R') {
            if (this.isSisterDoorOpen) {
                this.showDialogue('お姉ちゃんの部屋だ。');
            } else if (this.loopCount === 4) {
                this.showDialogue('お姉ちゃんの部屋の扉だ。<br>鍵がかかっている……。でも、中から微かに気配がする。');
            } else {
                this.showDialogue('お姉ちゃんの部屋の扉だ。<br>鍵がかかっていて開かない。');
            }
        }
        else if (target.name === 'FRONT_DOOR') {
            if (this.canExitHouse) {
                if (this.loopCount === 1) this.addProgress('escape_loop1');
                if (this.loopCount === 2) this.addProgress('escape_loop2');
                if (this.soundAssets.door_open) {
                    this.soundAssets.door_open.currentTime = 0;
                    this.soundAssets.door_open.play().catch(e => { });
                }
                if (this.loopCount === 4) {
                    this.addProgress('escape_loop4');
                    this.showDialogue('……扉が開いた。', () => {
                        this.playLoop4To5Transition();
                    });
                } else {
                    this.showDialogue('……扉が開いた。外の空気が、雨の匂いがする。', () => {
                        // 脱出直前の予兆演出
                        this.triggerGlitch(500);
                        setTimeout(() => {
                            this.loopToStart();
                        }, 500);
                    });
                }
            } else if (this.loopCount === 4) {
                this.showDialogue('……扉は開くはずなのに、なぜか手が動かない。', () => {
                    this.showDialogue('まだ、何かを忘れている気がする。この家の中に、僕が向き合わなければならない何かが。');
                });
            } else {
                this.showDialogue('玄関の扉だ。<br>……開かない。鍵穴もない。');
            }
        }
        else if (target.name === 'LOOP3_EXIT_DOOR') {
            this.addProgress('escape_loop3');
            this.showDialogue('……扉がある。<br>これを開ければ……！', () => {
                // ドアを開ける音を再生
                if (this.soundAssets.door_open) {
                    this.soundAssets.door_open.currentTime = 0;
                    this.soundAssets.door_open.play().catch(e => { });
                }
                this.loopToStart();
            });
        }
        else if (target.name === 'STAIRS_UP_1F') {
            // 3周目のチェイスフェーズ中は2階に戻れないようにブロック
            if (this.loopCount === 3) {
                if (this.loop3_1f_cinematic_triggered) {
                    this.showDialogue('……あれ！？階段を登れない…！！　');
                } else {
                    this.showDialogue('……なんだかひどく嫌な予感がする。今は二階に戻らない方がいいかもしれない。');
                }
                return;
            }

            this.showDialogue('二階へ戻りますか？', () => {
                this.showChoices('', [
                    {
                        text: '戻る',
                        action: () => {
                            this.closeDialogue();
                            this.goToSecondFloor();
                        }
                    },
                    {
                        text: 'やめる',
                        action: () => {
                            this.closeDialogue();
                        }
                    }
                ]);
            });
        }
        else if (target.name === 'LOOP2_ENTRANCE_KEYPAD') {
            if (this.loop2_puzzles.entrance) {
                this.showDialogue('電子ロックは既に解除されている。これ以上弄る必要はなさそうだ。');
                return;
            }
            this.addProgress('check_keypad');
            this.hasCheckedEntranceKeypad = true; // Set flag
            this.showDialogue('玄関の扉に、見慣れない電子ロックが取り付けられている。<br>こんなもの、うちにあったっけ……？', () => {
                this.showKeypadPuzzle('ENTRANCE', '1014', () => {
                    this.addProgress('unlock_keypad');
                    this.loop2_puzzles.entrance = true;
                    this.showDialogue('……『ガチャン』という重々しい解錠音とともに、電子ロックのランプが緑色に変わった。<br>お姉ちゃんの日記に書いていた日付…なんの日付なんだろう…。', () => {
                        // 2階から音が響く演出
                        if (this.soundAssets.thud) {
                            this.soundAssets.thud.currentTime = 0;
                            this.soundAssets.thud.play();
                        }
                        this.showDialogue('……その時、2階の方から「ゴトッ」と、何かが落ちるような音が聞こえた。', () => {
                            this.spawnLoop2Items(); // Spawns the room keypad
                            this.checkLoop2Progression();
                        });
                    });
                });
            });
        }
        else if (target.name === 'LOOP2_ROOM_KEYPAD') {
            if (this.loop2_puzzles.room) {
                this.showDialogue('ポロの絵のパズルは、正しく完成している。');
                return;
            }
            this.showDialogue('バラバラの絵合わせパズルが置いてある。', () => {
                this.showSlidingPuzzle(() => {
                    this.addProgress('clear_puzzle');
                    this.loop2_puzzles.room = true;
                    this.showDialogue('……パズルが完成した。<br>これは……ポロだ。', () => {
                        this.checkLoop2Progression();
                    });
                });
            });
        }
        else if (target.name === 'LOOP4_DRAWING') {
            if (this.loopCount === 4 && this.loop4_memory_count < 2) {
                this.showDialogue('お姉ちゃんの部屋の隅に、絵が落ちている。', () => {
                    this.showDialogue('……まだ、これを直視する勇気が出ない。もっと、思い出さないといけないことがあるはずだ。');
                });
                return;
            }
            this.showDialogue('床に、描きかけの絵が落ちている。', () => {
                this.showDialogue('子供の字で「あのこ」と書かれている。<br>……これは、お姉ちゃんが昔描いた絵だ。', () => {
                    this.showDialogue('何かに導かれるように、僕はその絵を裏返してみた。', () => {
                        this.showDialogue('そこには、クレヨンでたどたどしい字が書かれていた。', () => {
                            this.showDialogue('『はやくあいたいな。わたしの、かわいい いもうと』', () => {
                                this.showDialogue('『きっと、お兄ちゃんをいっぱい驚かせるような、いたずらっ子になるんだろうな』', () => {
                                    this.showDialogue('いもうと……？ 僕は末っ子で、お姉ちゃんと僕の二人だけのはずなのに。', () => {
                                        this.showDialogue('……僕には、妹ができるはずだったの？', () => {
                                            this.updateObjective('真実を受け入れ、外へ出る');
                                            this.canExitHouse = true;
                                            this.triggerGlitch(300);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
        else if (target.name === 'LOOP4_LIVING_MEMORY') {
            if (this.loopCount === 4 && !this.loop4_memories.living_room) {
                this.addProgress('memory_living');
                this.loop4_memories.living_room = true;
                this.loop4_memory_count++;
                this.showDialogue('青い光に触れると、頭の中に昔の光景が浮かんできた。', () => {
                    this.showDialogue('……テレビの音。お父さんとお母さんの笑い声。', () => {
                        this.showDialogue('でも……二人とも、どうしてあんなに悲しそうな顔で笑っていたんだろう。', () => {
                            this.triggerGlitch(200);
                            setTimeout(() => {
                                this.showDialogue('（……おにいちゃん、あそぼ……）', () => {
                                    this.showDialogue('……え？ お兄ちゃん？ 僕は、お姉ちゃんの弟だ。', () => {
                                        this.showDialogue('僕を『お兄ちゃん』って呼ぶ子なんて、うちにはいないのに……。', () => {
                                            this.checkLoop4Memories();
                                        });
                                    });
                                });
                            }, 1000);
                        });
                    });
                });
            } else {
                this.showDialogue('暖かくて、切ない記憶の残響が漂っている……。');
            }
        }
        else if (target.name === 'MOTHER_MEMO') {
            if (this.loopCount >= 6) {
                this.showDialogue('お母さんの字。<br>「捨てなきゃいけないのに、どうしても捨てられない」<br>……お母さんも苦しかったんだ。ずっと、ずっと。<br>捨てなくていいよ。忘れなくていいよ。');
            } else {
                this.showDialogue('……お母さんの字？<br>『捨てなきゃいけないのに、どうしても捨てられない』……。何のことだろう。');
            }
        }
        else if (target.name === 'FATHER_MEMO') {
            if (this.loopCount >= 6) {
                this.showDialogue('お父さんの字。<br>「時間が経って、忘れてしまった自分がいる。それは逃げたのと同じだ」<br>……お父さんでも、そうなんだ。<br>逃げたんじゃないよ。ただ……しんどかっただけだよ。');
            } else {
                this.showDialogue('床にメモが落ちている。お父さんの字だ。<br>「時間が経って、忘れてしまった自分がいる。それは逃げたのと同じだ。妻にも、子供たちにも言う気にならない」');
            }
        }
        else if (target.name === 'PORO_COLLAR') {
            if (this.loopCount >= 6) {
                this.showDialogue('ポロの首輪だ。<br>……ずっと、あの子のそばにいてくれたんだね。ありがとう、ポロ。');
            } else {
                this.showDialogue('……犬の首輪だ。赤くて、少しすり減ってる。<br>うちで飼ってた「ポロ」の首輪だ……。<br>ポロはもう何年も前に死んだはずなのに、どうしてこんな所に？');
            }
        }
        else if (target.name === 'LOOP3_MEMO') {
            this.showDialogue('階段の手前に、子供の字で書かれたメモが落ちている。<br>「けんけんぱって知ってる？ほら、丸を書いてそこに飛ぶ遊び。<br>右、左、右、右、左、右ってね。」');
        }
        else if (target.name === 'SISTER_DIARY') {
            this.hasCheckedSisterDiary = true;

            if (this.loopCount === 1) {
                this.addProgress('read_diary_1');
                this.showDialogue('……お姉ちゃんの日記帳だ。少しだけ、中を見てみよう……。', () => {
                    this.showDialogue('「小さいころとても泣いてた気がする。<br>弟はボーっとしてるだけ。<br>おかあさんとおとうさんも泣いていて…なんで泣いたんだろう」');
                });
            }
            else if (this.loopCount === 2) {
                this.addProgress('read_diary_2');
                this.showDialogue('……お姉ちゃんの日記帳だ。少しだけ、中を見てみよう……。', () => {
                    this.showDialogue('「小さいころとても泣いてた気がする。<br>弟はボーっとしてるだけ。<br>おかあさんとおとうさんも泣いていて…なんで泣いたんだろう」', () => {
                        const nextStep = () => {
                            this.showDialogue('……あれ？ さっき見た時は、こんなこと書いてなかったのに。', () => {
                                this.showDialogue('「その日のちょっと前までは、よく分からないけど、私すごく喜んでいた気がする。<br>お母さんと一緒にいる時間が長かったのもうれしかった」', () => {
                                    this.loop2_puzzles.diary = true;
                                    this.checkLoop2Progression();
                                });
                            });
                        };

                        if (this.hasCheckedEntranceKeypad) {
                            this.showDialogue('……日記の一番最後に、日付が書いてある。<br>「10月14日」', nextStep);
                        } else {
                            // In loop 2, if keypad not checked, just end here
                        }
                    });
                });
            }
            else if (this.loopCount === 3) {
                this.showDialogue('日記のページをめくると、震えるような字で書かれたページがあった。', () => {
                    this.showDialogue('「最近、ママがずっと泣いている。廊下の突き当たりの部屋に入っては、鍵を閉めて出てこない。お父さんは無理に笑って、私を遊びに連れて行こうとする。誰か、ここに幽霊でもいるみたい。私たち以外に、誰かが……。」');
                });
            }
            else if (this.loopCount === 4) {
                this.showDialogue('…！また見たことない日記が…。', () => {
                    this.showDialogue('「パパが『もう寝よっか』って言って、ベビーベッドを屋根裏に運んでた。それから、その話をしないようになった。でも、私にはわかる。夜、ベッドの端っこに、私よりずっと小さな誰かが座って、私を見てる気がする。それを言うとママがまた泣いちゃうから、私は黙ってることにした。」');
                });
            }
            else if (this.loopCount === 5) {
                this.showDialogue('乱れた筆跡で、悲痛な叫びのような言葉が並んでいた。', () => {
                    this.showDialogue('「お父さんとお母さんと、私と弟……。本当は、もう一人いるはずだった。五人の似顔絵を描いたけど、押入れの奥に隠した。みんなが『いなかったこと』にしても、私はあの子に会いたかった。ごめんね。秘密にしていて、ごめんね。」');
                });
            }
            else if (this.loopCount >= 6) {
                this.showDialogue('この日記……お姉ちゃんの字。', () => {
                    this.showDialogue('「小さいころとても泣いてた気がする。弟はボーっとしてるだけ」<br>……僕がまだ小さくて何もわからなかった頃から、お姉ちゃんは一人で抱え込んでいたんだ。', () => {
                        this.showDialogue('「その日のちょっと前まで、すごく喜んでいた気がする」<br>……あの子が来ることを、お姉ちゃんも楽しみにしてたんだ。', () => {
                            this.showDialogue('「今日があの子の生まれてくるはずだった日。お母さんのしぼんだお腹を見て、弟は不思議そうな顔をしていた。みんな、少しずつあの子のことを話さなくなっていく。でも、私だけはずっと、あの子のことを覚えていようと思う。忘れないよ。絶対に。」');
                        });
                    });
                });
            }
        }
        else if (target.name === 'SISTER_PHOTO') {
            this.showPhotoView();
        }

        else if (target.name === 'HOUSE_ESCAPE') {
            this.addProgress('escape_flat_world');
            if (this.swarmAnim) clearInterval(this.swarmAnim); // ★追加：裏で動いている敵の判定をここで止める

            this.showDialogue('……家だ！この中に逃げ込めば……！', () => {
                this.closeDialogue();
                // 逃げ込んだ後の救援演出（お姉ちゃんとポロが助けに来るムービー）を再生
                this.playRescueMovie();
            });
        }

        else if (target.name === 'PORO') {
            // 平面世界（FLAT_WORLD）にいる時は最優先でイベントトリガーにする
            if (this.currentFloor === "FLAT_WORLD") {
                if (this.poroState !== 'RUNAWAY' && this.poroState !== 'GONE') {
                    // 主人公の驚きのテキストを追加
                    this.showDialogue('……えっ。お前……ポロ、なの？', () => {
                        if (this.soundAssets.bark) {
                            this.soundAssets.bark.currentTime = 0;
                            this.soundAssets.bark.play().catch(e => { });
                        }
                        this.showDialogue('「ワンッ！」<br>ポロが短く鳴いて、遠くへ走り出した。', () => {
                            this.addProgress('talk_poro');
                            this.poroState = 'RUNAWAY';
                            // プレイヤーが向いている方向へポロを走らせる
                            const pDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.quaternion);
                            this.poroRunDirection = pDir.lengthSq() > 0 ? pDir.normalize() : new THREE.Vector3(1, 0, 0);
                            this.updateObjective('ポロ…どこへ行くの？');
                        });
                    });
                }
            } else if (this.loopCount >= 6) {
                this.showDialogue('ポロ……。君も、あの子のことを見守ってくれてたんだね。');
            } else if (this.loopCount === 5) {
                this.showDialogue('ポロが何か言いたげに僕を見ている。……どこかへ導こうとしているんだろうか。');
            } else {
                this.showDialogue('ポロのぬいぐるみかな？ ……でも、なんだか本物みたいだ。');
            }
        }
    }

    checkLoop2Progression() {
        if (this.loopCount !== 2) return;
        if (this.loop2_puzzles.diary && this.loop2_puzzles.entrance && this.loop2_puzzles.room) {
            this.canExitHouse = true;
            this.updateObjective('開いた玄関から、今度こそ脱出する');

            // 解錠演出
            this.soundAssets.door_open.currentTime = 0;
            this.soundAssets.door_open.play().catch(e => { });

            this.showDialogue('（ガチャッ…）<br>玄関の鍵が開いたような音がした。');
        }
    }

    showPhotoView() {
        if (this.loopCount < 4) this.addProgress('check_photo_1');
        this.hasCheckedPhoto = true;
        this.gameState = 'PHOTO_VIEW';
        // 足音停止とキーリセット
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets && this.soundAssets.footstep) {
            this.soundAssets.footstep.pause();
            this.soundAssets.footstep.currentTime = 0;
        }

        const overlay = document.getElementById('photo-overlay');
        const textContainer = document.getElementById('scattered-text-container');
        if (textContainer) textContainer.innerHTML = ''; // clear old text

        const photoImg = document.getElementById('photo-img');
        if (this.loopCount >= 4) {
            photoImg.src = './happy.png';
        } else {
            photoImg.src = './creepy.png';
        }

        if (this.loopCount === 4) {
            if (!this.loop4_memories.sister_room) {
                this.addProgress('memory_sister');
                this.loop4_memories.sister_room = true;

                this.showDialogue('床に、絵が落ちている。', () => {
                    this.showDialogue('これは……お姉ちゃんが描いた家族の絵だ。', () => {
                        this.showDialogue('お父さん、お母さん、お姉ちゃんと僕……そして、もう一人『知らない女の子』が描かれている。', () => {
                            this.showDialogue('二人きりのきょうだいだと思ってた。でも……あの声、あのベビー服……僕には、妹がいたの？', () => {
                                this.triggerGlitch(200);
                                this.showDialogue('何かに導かれるように、僕はその絵を裏返してみた。', () => {
                                    this.showDialogue('そこには、クレヨンでたどたどしい字が書かれていた。', () => {
                                        this.showDialogue('『はやくあいたいな。わたしの、かわいい いもうと』', () => {
                                            this.showDialogue('『きっと、お兄ちゃんをいっぱい驚かせるような、いたずらっ子になるんだろうな』', () => {
                                                this.showDialogue('……僕には、妹ができるはずだったんだ。', () => {
                                                    this.updateObjective('真実を受け入れ、外へ出る');
                                                    this.canExitHouse = true; // 脱出可能になる
                                                    this.triggerGlitch(300);
                                                    this.closePhotoView();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else {
                this.showDialogue('……さっきの絵だ。', () => {
                    this.closePhotoView();
                });
            }
        }
        else if (this.loopCount >= 6) {
            this.showDialogue('…………これは。お姉ちゃんが昔、大切に持っていた絵だ。<br>生まれてこれなかった「妹」のことを、お姉ちゃんだけはずっと覚えていたんだ。', () => {
                this.showDialogue('「お兄ちゃんと遊びたかったね」って、お姉ちゃんが泣きながら描いていた絵……。<br>本当は押入れの奥に仕まってあったはずなのに、どうしてここにあるんだろう。', () => {
                    this.showDialogue('……そうか。君はずっと、独りで寂しかったんだね。', () => {
                        this.closePhotoView();
                    });
                });
            });
        }

        overlay.style.display = 'flex';
    }

    closePhotoView() {
        this.gameState = 'PLAYING';
        document.getElementById('photo-overlay').style.display = 'none';

        // 4周目以降はこのセリフを出さないようにする
        if (this.loopCount < 4) {
            this.updateObjective("不気味な絵");
            this.showDialogue("……なんだこれ。家族の絵…？。<br>でも、僕の家4人しかいないし、お母さんと手をつないでるこの気味の悪い子は……誰だろう。");
        }
    }

    openDoorSequence() {
        this.addProgress('open_boy_door');
        this.isDoorOpen = true;
        this.updateObjective('静かすぎる家の中を調べる');

        this.soundAssets.door_open.play();

        let t = 0;
        const anim = setInterval(() => {
            t += 0.05;
            this.door.position.x -= 0.05;
            if (t > 1.5) clearInterval(anim);
        }, 16);
    }

    openLeftRoom() {
        this.addProgress('open_left_room');
        this.isLeftRoomOpen = true;
        this.isRightRoomOpen = true; // Secretly open right room too
        this.updateObjective("開いた部屋を調べる");

        this.soundAssets.door_open.play();

        const doorL = this.interactables.find(i => i.name === 'DOOR_1F_L').obj;
        const doorR = this.interactables.find(i => i.name === 'DOOR_1F_R').obj;

        let t = 0;
        const anim = setInterval(() => {
            t += 0.05;
            doorL.position.z += 0.05;
            doorR.position.z -= 0.05; // Secretly slide right door
            if (t > 1.5) {
                clearInterval(anim);

                const oX = 100;
                // Dynamically open physical collision gaps by removing the door blocker collision objects
                this.collisionObjects1F = this.collisionObjects1F.filter(
                    c => !(c[0] === oX - 2.25 && c[1] === oX - 1.75 && c[2] === -6.75 && c[3] === -5.25) && // remove left door gap
                        !(c[0] === oX + 1.75 && c[1] === oX + 2.25 && c[2] === -6.75 && c[3] === -5.25)    // remove parents door gap
                );
            }
        }, 16);
    }

    triggerSisterEvent() {
        if (this.isSisterEventTriggered) return;
        this.isSisterEventTriggered = true;

        this.triggerGlitch(400);
        this.showDialogue('（ガチャッ…）<br>お姉ちゃんの部屋の扉が開いた音がした……。<br>……お姉ちゃん？', () => {
            this.openSisterDoor();
        });
    }

    playCinematicEvent() {
        if (this.isCinematicPlaying) return;
        this.isCinematicPlaying = true;
        this.gameState = 'EVENT';

        // Clear callback BEFORE closing to prevent infinite recursion
        this.dialogueCloseCallback = null;
        document.getElementById('dialogue-box').style.display = 'none';

        // Sprite setup
        const tex = new THREE.TextureLoader().load('./images/sister_monster.png');
        const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, alphaTest: 0.5 });
        const monster = new THREE.Sprite(mat);
        monster.scale.set(2.5, 3.5, 1);
        monster.position.set(0, 1.4, -20); // Start at bottom of stairs, near floor
        this.scene.add(monster);

        // Add a point light that travels WITH the monster (so it's always lit)
        const monsterLight = new THREE.PointLight(0xff6644, 3.0, 12);
        monsterLight.position.copy(monster.position);
        this.scene.add(monsterLight);

        // Also temporarily brighten the hallway ambient
        const cinemaAmbient = new THREE.AmbientLight(0x554444, 1.2);
        this.scene.add(cinemaAmbient);

        // Reposition camera to look down the hallway from the boy's room door area
        const oldCamPos = this.camera.position.clone();
        const oldCamRot = this.camera.rotation.clone();
        this.camera.position.set(0, 1.8, -6); // Just outside boy's room, low angle

        // Footstep audio: short clip, played manually in sync with animation
        const stepAudio = this.soundAssets.heavy_footsteps;
        if (stepAudio) {
            stepAudio.loop = false;
        }

        const playStep = () => {
            if (stepAudio) {
                stepAudio.currentTime = 0;
                stepAudio.play().catch(e => console.log(e));
            }
        };

        let timeOffset = 0;
        let prevSin = 0;
        let phase = 0; // 0: walking up, 1: wait, 2: turning, 3: walk down

        const anim = setInterval(() => {
            timeOffset += 0.016;

            // Camera always looks at monster
            this.camera.lookAt(monster.position);

            // Update monster light position
            monsterLight.position.copy(monster.position);
            monsterLight.position.y += 0.5;

            const sinVal = Math.sin(timeOffset * 7);

            if (phase === 0 || phase === 3) {
                const walking = (phase === 0);
                monster.position.z += walking ? 0.025 : -0.025;

                // Pronounced walking: big up-down bob + left-right sway
                const step = Math.abs(sinVal) * 0.35;
                const sway = sinVal * 0.18;
                monster.position.y = 1.4 + step;
                monster.position.x = sway;

                // Scale pulse on impact
                const scaleY = 3.5 - step * 0.15;
                monster.scale.set(2.5, scaleY, 1);

                // Detect sin zero-crossing → foot hits ground → play step sound
                if (prevSin * sinVal < 0) {
                    playStep();
                }

                if (phase === 0 && monster.position.z >= -9.0) {
                    phase = 1;
                    monster.position.z = -9.0;
                    monster.position.y = 1.4;
                    monster.position.x = 0;
                    monster.scale.set(2.5, 3.5, 1);
                    setTimeout(() => {
                        phase = 2;
                    }, 4000);
                }

                if (phase === 3 && monster.position.z <= -20) {
                    clearInterval(anim);
                    this.scene.remove(monster);
                    this.scene.remove(monsterLight);
                    this.scene.remove(cinemaAmbient);

                    setTimeout(() => {
                        this.addProgress('see_monster_shadow');
                        this.closeDialogue();
                        this.camera.position.copy(oldCamPos);
                        this.camera.rotation.copy(oldCamRot);
                        this.isCinematicPlaying = false;
                        this.canExitHouse = true;
                        this.gameState = 'PLAYING';
                        this.updateObjective('開いた扉から廊下へ出る');

                        // Re-open the left door and release collision gap so the player can escape
                        this.is2FLeftRoomTrapped = false;
                        this.is2FEscapeReady = true;
                        this.soundAssets.door_open.currentTime = 0;
                        this.soundAssets.door_open.play().catch(e => { });
                        let t2 = 0;
                        const openAnim = setInterval(() => {
                            t2 += 0.05;
                            this.doorL2F.position.z -= 0.05; // slide open
                            if (t2 > 1.5) {
                                clearInterval(openAnim);
                                this.showDialogue('…今誰か廊下にいたよね？');
                            }
                        }, 16);
                    }, 1000);
                }

            } else if (phase === 2) {
                phase = 3;
            }

            prevSin = sinVal;
        }, 16);
    }

    openSisterDoor() {
        this.addProgress('open_sister_door');
        this.isSisterDoorOpen = true;
        this.updateObjective("開いた部屋を調べる");

        this.soundAssets.door_open.play();

        let t = 0;
        const anim = setInterval(() => {
            t += 0.05;
            this.doorR.position.z -= 0.05;
            if (t > 1.5) clearInterval(anim);
        }, 16);
    }

    goToFirstFloor() {
        if (this.loopCount === 1) this.addProgress('go_1f_loop1');
        if (this.loopCount === 3) this.addProgress('go_1f_loop3');
        if (this.loopCount >= 6) this.addProgress('go_1f_loop6');
        this.soundAssets.stairs.play();
        const fader = this.createFader();
        fader.style.opacity = '1';
        this.gameState = 'FADING';

        setTimeout(() => {
            this.currentFloor = 1;
            const oX = 100;

            if (this.gameState === 'MAP_VIEW') {
                this.mapViewFloor = 1;
                this.renderMap();
            }

            this.player.position.set(oX, -10, 9);
            this.camera.position.set(oX, -4, 15);

            setTimeout(() => {
                fader.style.opacity = '0';
                this.gameState = 'PLAYING';

                // 周回ごとに1階に降りた時のヒントを変える
                if (this.loopCount === 1) {
                    this.updateObjective('');
                } else if (this.loopCount === 3) {
                    this.updateObjective('静まり返った1階を調べる');
                } else if (this.loopCount >= 6) {
                    this.updateObjective('あの子の待つ場所へ');
                }
            }, 500);
        }, 1000);
    }

    goToSecondFloor() {
        if (this.loopCount === 1) this.addProgress('go_2f_loop1');
        this.gameState = 'TRANSITION';
        this.soundAssets.stairs.play();
        this.triggerGlitch(1000);
        setTimeout(() => {
            this.currentFloor = 2;
            if (this.gameState === 'MAP_VIEW') {
                this.mapViewFloor = 2;
                this.renderMap();
            }

            if (this.hasOpenedParentsBox && !this.is2FLeftRoomTrapped) {
                this.is2FLeftRoomTrapArmed = true;
                if (this.doorL2F) this.doorL2F.position.z = -14.5;

                this.collisionObjects2F = (this.collisionObjects2F || []).filter(
                    c => !(c[0] === -2.25 && c[1] === -1.75 && c[2] === -13.75 && c[3] === -12.25)
                );
            }

            this.player.position.set(0, 0, -18.5);
            this.camera.position.set(0, 6, -12.5);
            this.gameState = 'PLAYING';

            // 周回ごとに2階に戻った時のヒントを変える
            if (this.loopCount === 1) {
                this.updateObjective('物音の正体を確かめる');
            } else if (this.loopCount === 2 && this.loop2_puzzles.entrance) {
                this.updateObjective('2階から聞こえた物音を確かめる');
            }

            if (this.loopCount === 2 && this.loop2_puzzles.entrance && !this.hasShownPostKeypad2FDialogue) {
                this.hasShownPostKeypad2FDialogue = true;
                this.showDialogue('……やっぱり、何かおかしい。みんな家にいないし、家から出られない…。', () => {
                    this.showDialogue('…とりあえず、さっきの音の正体を確かめないと。');
                });
            }
        }, 500);
    }

    triggerLoop3ChaseCinematic() {
        if (this.loop3_1f_cinematic_triggered) return;
        this.loop3_1f_cinematic_triggered = true;
        this.gameState = 'EVENT';
        this.isCinematicPlaying = true;

        const oX = 100;
        const oldCamPos = this.camera.position.clone();

        // 停止と音の停止
        this.keys = { w: false, a: false, s: false, d: false, space: false };
        if (this.soundAssets.footstep) this.soundAssets.footstep.pause();

        // 1. 予兆：物音と照明の変化
        if (this.soundAssets.thud) this.soundAssets.thud.play();

        // 照明を極端に暗くする（点滅のタメ）
        const originalLightIntensity = this.pointLight ? this.pointLight.intensity : 1;
        if (this.pointLight) this.pointLight.intensity = 0.05;

        this.showDialogue('…………ん？ 今、奥の方で何か音がしたような……。', () => {
            // 2. カメラを廊下の奥に向ける
            this.camera.position.set(oX, -8, -4);
            this.camera.lookAt(oX, -8, -15); // 廊下の奥を見る

            setTimeout(() => {
                // 3. 足音の開始
                if (this.soundAssets.heavy_footsteps) {
                    this.soundAssets.heavy_footsteps.loop = true;
                    this.soundAssets.heavy_footsteps.currentTime = 0;
                    this.soundAssets.heavy_footsteps.play().catch(e => { });
                }

                this.showDialogue('……お姉ちゃん？ そこにいるの？ 冗談はやめてよ……。', () => {
                    // 4. モンスターの出現シーケンス
                    const loader = new THREE.TextureLoader();
                    const tex = loader.load('./images/sister_monster.png');
                    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.5, opacity: 0 });
                    const monsterSprite = new THREE.Sprite(mat);
                    monsterSprite.scale.set(2.5, 3.5, 1);
                    monsterSprite.position.set(oX, -8.4, -12); // 廊下の奥に出現
                    this.scene.add(monsterSprite);

                    const mLight = new THREE.PointLight(0xff3311, 0, 14);
                    mLight.position.copy(monsterSprite.position);
                    this.scene.add(mLight);

                    // 照明の激しい点滅と共に出現
                    let flickerCount = 0;
                    const flickerInterval = setInterval(() => {
                        flickerCount++;
                        const isVisible = flickerCount % 2 === 0;
                        monsterSprite.material.opacity = isVisible ? 1 : 0;
                        if (this.pointLight) this.pointLight.intensity = isVisible ? 1.5 : 0.05;
                        mLight.intensity = isVisible ? 3.5 : 0;

                        if (flickerCount > 10) {
                            clearInterval(flickerInterval);
                            monsterSprite.material.opacity = 1;
                            if (this.pointLight) this.pointLight.intensity = 1.5;
                            mLight.intensity = 3.5;

                            // 5. 追いかけっこ開始前の絶叫・グリッチ
                            this.triggerGlitch(800);
                            this.showDialogue('う、うわあああああああ！！！', () => {
                                // 終了処理：実際のモンスターにバトンタッチ
                                this.scene.remove(monsterSprite);
                                this.scene.remove(mLight);
                                if (this.pointLight) this.pointLight.intensity = originalLightIntensity;

                                if (this.monster) {
                                    this.monster.position.set(oX, -8.4, -10);
                                }

                                this.isCinematicPlaying = false;
                                this.gameState = 'PLAYING';
                                document.getElementById('dialogue-box').style.display = 'none';
                                this.camera.position.copy(oldCamPos);
                                this.updateObjective('逃げろ！！');
                            });
                        }
                    }, 100);
                });
            }, 1000);
        });
    }

    playPoroSwarmEvent() {
        if (this.isCinematicPlaying) return;
        this.isCinematicPlaying = true;
        this.gameState = 'EVENT';

        // Save restart position (slightly back from current to avoid instant re-trigger)
        const restartPos = this.player.position.clone();

        // 1. Camera Transition: Look behind the player
        const swarmDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.quaternion);
        const cameraPosBehind = this.player.position.clone().add(swarmDirection.clone().multiplyScalar(-6)).add(new THREE.Vector3(0, 4, 0));

        this.camera.position.copy(cameraPosBehind);
        this.camera.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z);

        // 2. Spawn Swarm
        const loader = new THREE.TextureLoader();
        loader.load('./images/creepy_entity.png', (texture) => {
            const swarmGroup = new THREE.Group();
            this.scene.add(swarmGroup);

            const swarmCount = 35;
            const sprites = [];
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, color: 0xffffff, alphaTest: 0.5 });

            // Calculate player's backward angle
            const playerRotY = this.player.rotation.y;

            for (let i = 0; i < swarmCount; i++) {
                const s = new THREE.Sprite(mat);

                // Angle relative to player's backward direction (playerRotY + PI)
                const relativeAngle = (Math.random() - 0.5) * Math.PI; // 180 deg arc
                const spawnAngle = playerRotY + Math.PI + relativeAngle;

                const dist = 30 + Math.random() * 15; // Start much further away for 5s intro

                s.position.set(
                    this.player.position.x + Math.sin(spawnAngle) * dist,
                    -8.5 + Math.random() * 2, // Slight height variation
                    this.player.position.z + Math.cos(spawnAngle) * dist
                );
                s.scale.set(3, 4, 1);
                swarmGroup.add(s);
                sprites.push(s);
            }
            this.currentSwarmSprites = sprites;

            // 3. Animation Loop
            if (this.soundAssets.chase) {
                this.soundAssets.chase.currentTime = 0;
                this.soundAssets.chase.play().catch(e => { });
            }

            // Show introductory text
            this.showDialogue('…………！？ 足音が近づいてくる！');
            this.gameState = 'EVENT';

            setTimeout(() => {
                if (this.gameState === 'EVENT' && this.isCinematicPlaying) {
                    this.isCinematicPlaying = false;
                    this.closeDialogue();
                    this.updateObjective('振り返らずに逃げろ！(生き残る)');
                }
            }, 3000);

            this.swarmPhase = 'CHASING';
            let timeSurvived = 0;
            let elapsed = 0;

            this.swarmAnim = setInterval(() => {
                elapsed += 0.016;
                if (this.gameState === 'PLAYING') {
                    timeSurvived += 0.016;
                }

                let anyCaught = false;

                if (this.swarmPhase === 'CHASING' || this.swarmPhase === 'ESCAPE_ROUTE') {
                    sprites.forEach(s => {
                        const dir = this.player.position.clone().sub(s.position).normalize();
                        const speed = 0.045 + (elapsed * 0.001);
                        s.position.add(dir.multiplyScalar(speed));
                        s.position.y = -8.5 + Math.sin(elapsed * 10 + sprites.indexOf(s)) * 0.2;

                        const dx = this.player.position.x - s.position.x;
                        const dz = this.player.position.z - s.position.z;
                        const distXZ = Math.sqrt(dx * dx + dz * dz);
                        if (this.gameState === 'PLAYING' && distXZ < 1.2) {
                            anyCaught = true;
                        }
                    });
                } else if (this.swarmPhase === 'CINEMATIC_RESCUE') {
                    sprites.forEach(s => {
                        s.position.x += (Math.random() - 0.5) * 0.4;
                        s.position.y += (Math.random() - 0.5) * 0.4;
                        s.position.z += (Math.random() - 0.5) * 0.4;
                    });
                } else if (this.swarmPhase === 'RESCUE') {
                    sprites.forEach(s => {
                        s.position.y += (Math.random() - 0.5) * 0.5;
                        s.position.x += (Math.random() - 0.5) * 0.5;
                        s.material.opacity -= 0.015;
                    });
                    if (sprites[0].material.opacity <= 0) {
                        clearInterval(anim);
                        this.scene.remove(swarmGroup);
                    }
                }

                if (anyCaught && this.swarmPhase !== 'RESCUE') {
                    clearInterval(this.swarmAnim);
                    this.triggerGlitch(800);

                    // 捕まった時の絶望的な音
                    if (this.soundAssets.thud_2f) {
                        this.soundAssets.thud_2f.currentTime = 0;
                        this.soundAssets.thud_2f.play().catch(e => { });
                    }

                    this.gameState = 'EVENT';
                    const fader = this.createFader();
                    fader.style.transition = 'opacity 0.2s ease-in';
                    fader.style.opacity = '1';

                    setTimeout(() => {
                        this.scene.remove(swarmGroup);

                        // ★追加：残ってしまった家と赤い道を確実に消去する
                        if (this.redLineGroup) {
                            this.scene.remove(this.redLineGroup);
                            this.redLineGroup = null;
                        }
                        if (this.flatWorldHouseGroup) {
                            this.scene.remove(this.flatWorldHouseGroup);
                            this.flatWorldHouseGroup = null;
                        }

                        if (this.soundAssets.chase) this.soundAssets.chase.pause();

                        // 1週目のBGM(ambient)を止め、5周目の雨の音(rain)を再生
                        if (this.soundAssets.ambient) this.soundAssets.ambient.pause();
                        if (this.soundAssets.rain && this.soundAssets.rain.paused) {
                            this.soundAssets.rain.currentTime = 0;
                            this.soundAssets.rain.play().catch(e => { });
                        }

                        // 平面世界を初期状態（ポロが止まっている状態）にリセット
                        this.setupFlatWorld();

                        setTimeout(() => {
                            fader.style.transition = 'opacity 2s ease-out';
                            fader.style.opacity = '0';
                            this.isCinematicPlaying = false;
                            this.gameState = 'PLAYING';

                            // 捕まってやり直しになった時の専用テキスト
                            this.showDialogue('……！？ はっ……！<br>捕まったはずじゃ……。', () => {
                                this.showDialogue('……夢？ いや、またこの何もない場所に戻ってきたのか……。');
                            });
                            this.updateObjective('ただ歩き続ける', 100.000);
                        }, 1000);
                    }, 500);
                }

                if (timeSurvived > 20 && this.swarmPhase === 'CHASING') {
                    this.swarmPhase = 'ESCAPE_ROUTE';
                    if (this.soundAssets.bark) {
                        this.soundAssets.bark.currentTime = 0;
                        this.soundAssets.bark.play();
                    }

                    const pDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.quaternion);
                    const houseX = this.player.position.x + pDir.x * 40;
                    const houseZ = this.player.position.z + pDir.z * 40;

                    // Draw a red path leading to the house
                    const lineGeo = new THREE.PlaneGeometry(1.0, 40);
                    const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
                    const redLine = new THREE.Mesh(lineGeo, lineMat);
                    redLine.rotation.x = -Math.PI / 2;
                    redLine.position.z = -20; // local offset so it reaches forward

                    const redLineGroup = new THREE.Group();
                    redLineGroup.position.copy(this.player.position);
                    redLineGroup.position.y = -9.95; // just above ground
                    redLineGroup.rotation.y = this.player.rotation.y;
                    redLineGroup.add(redLine);
                    this.scene.add(redLineGroup);
                    this.redLineGroup = redLineGroup; // ★追加：消すための記憶を持たせる

                    const hGroup = new THREE.Group();
                    const hMat = new THREE.MeshBasicMaterial({ color: 0x221111 });
                    const houseBox = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), hMat);
                    houseBox.position.y = -7;
                    hGroup.add(houseBox);

                    const dMat = new THREE.MeshBasicMaterial({ color: 0x553322 });
                    const dMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.2), dMat);
                    dMesh.position.set(0, -8.25, 3.1);
                    hGroup.add(dMesh);

                    hGroup.position.set(houseX, 0, houseZ);
                    hGroup.lookAt(this.player.position.x, 0, this.player.position.z);
                    this.scene.add(hGroup);
                    this.flatWorldHouseGroup = hGroup;

                    const doorWorldPos = new THREE.Vector3();
                    dMesh.getWorldPosition(doorWorldPos);
                    this.interactables.push({ obj: dMesh, name: 'HOUSE_ESCAPE', x: doorWorldPos.x, z: doorWorldPos.z });

                    this.updateObjective('赤い線の先に見える家へ急げ！');
                }

                if (elapsed > 120 && this.swarmPhase !== 'RESCUE') {
                    clearInterval(this.swarmAnim);
                    this.scene.remove(swarmGroup);
                }
            }, 16);
        });
    }

    playRescueMovie() {
        playRescueMovieSequence(this);
    }

    buildFirstFloor() {
        const oX = 100; // Offset X position for 1st floor map

        // Loop 3 maze override removed - the house is now the same, only the exit differs.

        // Floor
        const hallLength = 20;
        const floorGeo = new THREE.PlaneGeometry(4, hallLength, 4, 20);

        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, 64, 64); ctx.fillRect(64, 64, 64, 64);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 10);
        const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(oX, -10, 0);
        floor.receiveShadow = true;
        this.mapRoot.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x020202 });

        // Left Wall (West, oX - 2)
        const lWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6), wallMat);
        lWall1.position.set(oX - 2, -7.5, 7);
        this.mapRoot.add(lWall1);

        this.door1F_Toilet = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        this.door1F_Toilet.position.set(oX - 1.8, -8.25, 4);
        if (this.loopCount >= 2) this.door1F_Toilet.position.z += 1.5; // Open
        this.mapRoot.add(this.door1F_Toilet);
        this.interactables.push({ obj: this.door1F_Toilet, name: 'TOILET', x: oX - 1.8, z: 4 });

        // --- Toilet Room Walls ---
        if (this.loopCount === 5 && this.loop4_fridge_checked) {
            // Extended Horror Toilet Corridor
            const extLen = 15; // Extra length
            const toiletFloor1F = new THREE.Mesh(new THREE.PlaneGeometry(3 + extLen, 3), floorMat);
            toiletFloor1F.rotation.x = -Math.PI / 2;
            toiletFloor1F.position.set(oX - 3.5 - (extLen / 2), -10, 4);
            this.mapRoot.add(toiletFloor1F);

            const toiletWallW1F = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.5), wallMat);
            toiletWallW1F.position.set(oX - 5.25 - extLen, -7.5, 4);
            this.mapRoot.add(toiletWallW1F);

            const toiletWallN1F = new THREE.Mesh(new THREE.BoxGeometry(3.5 + extLen, 5, 0.5), wallMat);
            toiletWallN1F.position.set(oX - 3.5 - (extLen / 2), -7.5, 2.5);
            this.mapRoot.add(toiletWallN1F);

            const toiletWallS1F = new THREE.Mesh(new THREE.BoxGeometry(3.5 + extLen, 5, 0.5), wallMat);
            toiletWallS1F.position.set(oX - 3.5 - (extLen / 2), -7.5, 5.5);
            this.mapRoot.add(toiletWallS1F);

            // Add the ominous glitch interactable at the very end
            const loop4ButtonMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0x550000 });
            const loop4Button = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.5), loop4ButtonMat);
            loop4Button.position.set(oX - 5.0 - extLen, -8.0, 4);
            this.mapRoot.add(loop4Button);
            this.interactables.push({ obj: loop4Button, name: 'LOOP4_TOILET_BUTTON', x: oX - 5.0 - extLen, z: 4 });

            // Creepy lighting at the end
            const horrorLight = new THREE.PointLight(0xff2222, 1.0, 5);
            horrorLight.position.set(oX - 5.0 - extLen, -7.0, 4);
            this.mapRoot.add(horrorLight);

        } else {
            // Normal Toilet
            const toiletFloor1F = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), floorMat);
            toiletFloor1F.rotation.x = -Math.PI / 2;
            toiletFloor1F.position.set(oX - 3.5, -10, 4);
            this.mapRoot.add(toiletFloor1F);

            const toiletWallW1F = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.5), wallMat);
            toiletWallW1F.position.set(oX - 5.25, -7.5, 4);
            this.mapRoot.add(toiletWallW1F);

            const toiletWallN1F = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5, 0.5), wallMat);
            toiletWallN1F.position.set(oX - 3.5, -7.5, 2.5);
            this.mapRoot.add(toiletWallN1F);

            const toiletWallS1F = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5, 0.5), wallMat);
            toiletWallS1F.position.set(oX - 3.5, -7.5, 5.5);
            this.mapRoot.add(toiletWallS1F);
        }

        const lWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 8.5), wallMat);
        lWall2.position.set(oX - 2, -7.5, -1);
        this.mapRoot.add(lWall2);

        this.door1F_L = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        this.door1F_L.position.set(oX - 1.8, -8.25, -6);
        if (this.loopCount >= 2) this.door1F_L.position.z += 1.5; // Open
        this.mapRoot.add(this.door1F_L);
        this.interactables.push({ obj: this.door1F_L, name: 'DOOR_1F_L', x: oX - 1.8, z: -6 });

        const lWall3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.25), wallMat);
        lWall3.position.set(oX - 2, -7.5, -8.375);
        this.mapRoot.add(lWall3);

        // Right Wall (East, oX + 2)
        // Note: rWall1 is removed to open up the kitchen area all the way to Z = 10

        // Living Room & Kitchen bounds (Expanded to the Right and Front)
        const livFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), floorMat);
        livFloor.rotation.x = -Math.PI / 2;
        livFloor.position.set(oX + 8, -10, 5);
        this.mapRoot.add(livFloor);

        const livN = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 0.5), wallMat);
        livN.position.set(oX + 8, -7.5, 0);
        this.mapRoot.add(livN);

        const livE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 10), wallMat);
        livE.position.set(oX + 14, -7.5, 5);
        this.mapRoot.add(livE);

        // --- Back-Left Room Bounds ---
        const leftRoomFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat);
        leftRoomFloor.rotation.x = -Math.PI / 2;
        leftRoomFloor.position.set(oX - 5, -10, -6);
        this.mapRoot.add(leftRoomFloor);

        const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6), wallMat);
        leftW.position.set(oX - 8, -7.5, -6);
        this.mapRoot.add(leftW);

        const leftN = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 0.5), wallMat);
        leftN.position.set(oX - 5, -7.5, -9);
        this.mapRoot.add(leftN);

        // --- Back-Right Room Bounds (Parents Room) ---
        const rightRoomFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat);
        rightRoomFloor.rotation.x = -Math.PI / 2;
        rightRoomFloor.position.set(oX + 5, -10, -6);
        this.mapRoot.add(rightRoomFloor);

        const rightE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6), wallMat);
        rightE.position.set(oX + 8, -7.5, -6);
        this.mapRoot.add(rightE);

        const rightN = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 0.5), wallMat);
        rightN.position.set(oX + 5, -7.5, -9);
        this.mapRoot.add(rightN);

        // Mystery Box in Parents Room
        const furnMatBox = new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.9 });
        const parentsBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), furnMatBox);
        parentsBox.position.set(oX + 5, -9.6, -6);
        this.mapRoot.add(parentsBox);
        this.interactables.push({ obj: parentsBox, name: 'PARENTS_BOX', x: oX + 5, z: -6 });

        // --- Furniture ---
        const furnMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x151010, roughness: 0.9 });
        const tvMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 0.2, metalness: 0.8 });

        // Kitchen Counter (Front area)
        const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 1), furnMat);
        counter.position.set(oX + 7, -9.4, 7);
        this.mapRoot.add(counter);

        // Fridge
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1), furnMat);
        fridge.position.set(oX + 13, -8.5, 9);
        this.mapRoot.add(fridge);
        this.interactables.push({ obj: fridge, name: 'FRIDGE', x: oX + 13, z: 9 });

        // Left Room Props (Storage)
        const storageBox1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), furnMat);
        storageBox1.position.set(oX - 7, -9.25, -4);
        this.mapRoot.add(storageBox1);

        const storageBox2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), furnMat);
        storageBox2.position.set(oX - 7.2, -9.4, -5.5);
        this.mapRoot.add(storageBox2);

        const oldDesk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 1.2), furnMat);
        oldDesk.position.set(oX - 4, -9.4, -8.2);
        this.mapRoot.add(oldDesk);

        // TV Stand (Back area)
        const tvStand = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 1), furnMat);
        tvStand.position.set(oX + 8, -9.7, 0.5);
        this.mapRoot.add(tvStand);

        // TV
        const tv = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.1), tvMat);
        tv.position.set(oX + 8, -8.5, 0.5);
        this.mapRoot.add(tv);

        // Sofa
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.5), sofaMat);
        sofaBack.position.set(oX + 8, -9.4, 4);
        this.mapRoot.add(sofaBack);
        const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 1), sofaMat);
        sofaSeat.position.set(oX + 8, -9.75, 3.25);
        this.mapRoot.add(sofaSeat);

        // Table
        const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1), furnMat);
        table.position.set(oX + 8, -9.75, 2);
        this.mapRoot.add(table);

        // Mother's Memo on Table
        const memoGeo = new THREE.BoxGeometry(0.4, 0.02, 0.5);
        const memoMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        const motherMemo = new THREE.Mesh(memoGeo, memoMat);
        motherMemo.position.set(oX + 8, -9.48, 2);
        this.mapRoot.add(motherMemo);
        this.interactables.push({ obj: motherMemo, name: 'MOTHER_MEMO', x: oX + 8, z: 2 });

        // Right Hall Wall (back side)
        const rWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 5.25), wallMat);
        rWall2.position.set(oX + 2, -7.5, -2.625);
        this.mapRoot.add(rWall2);

        this.door1F_R = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
        this.door1F_R.position.set(oX + 1.8, -8.25, -6);
        if (this.loopCount >= 2) this.door1F_R.position.z -= 1.5; // Open
        this.mapRoot.add(this.door1F_R);
        this.interactables.push({ obj: this.door1F_R, name: 'DOOR_1F_R', x: oX + 1.8, z: -6 });

        const rWall3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 3.25), wallMat);
        rWall3.position.set(oX + 2, -7.5, -8.375);
        this.mapRoot.add(rWall3);

        // Light
        const hallLight = new THREE.PointLight(0x442222, 6.0, 30);
        hallLight.position.set(oX, -6, 0);
        this.addLight(hallLight, 6.0);

        const livLight = new THREE.PointLight(0x223322, 4.5, 15);
        livLight.position.set(oX + 6, -6, 3);
        this.addLight(livLight, 4.5);

        if (this.loopCount === 3) {
            // --- Loop 3+: V-Junction beyond the Entrance ---
            // Simplified materials (easier to see)
            const vWallMat = new THREE.MeshStandardMaterial({ color: 0x151515 });
            const vFloorMat = floorMat; // Use the same house floor

            // Loop 3: Memory Sequence Maze 
            // Sequence of Correct Turns: Right, Left, Right, Right, Left, Right
            const sequence = ['Right', 'Left', 'Right', 'Right', 'Left', 'Right'];
            const L_CORRECT = 10;
            const L_DEAD = 16; //行き止まりを長くしてミス時のリカバリーを難しくする

            const startGroup = new THREE.Group();
            startGroup.position.set(oX, -10, -11.5);
            this.mapRoot.add(startGroup);

            // Connection floor to fill the gap between house entrance and first V-junction
            const connectFloor = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), vFloorMat);
            connectFloor.rotation.x = -Math.PI / 2;
            connectFloor.position.set(oX, -10, -10.5);
            this.mapRoot.add(connectFloor);

            let currentAnchor = startGroup;
            let currentAbsAngle = 0; // Starts facing straight North (-Z)

            // Collect collision requests to calculate exact World coordinates later
            const colRequests = [];

            for (let i = 0; i < sequence.length; i++) {
                const correctDir = sequence[i];

                ['Left', 'Right'].forEach(dir => {
                    const isCorrect = (dir === correctDir);
                    const isLast = isCorrect && (i === sequence.length - 1);

                    const localAngle = (dir === 'Left') ? (Math.PI / 4) : (-Math.PI / 4);
                    const branchAbsAngle = currentAbsAngle + localAngle;
                    const branchAbsAngleDeg = Math.round(branchAbsAngle * 180 / Math.PI);

                    const branchLength = isCorrect ? L_CORRECT : L_DEAD;

                    const branch = new THREE.Group();
                    branch.rotation.y = localAngle;
                    currentAnchor.add(branch);

                    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, branchLength), vFloorMat);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.z = -branchLength / 2;
                    branch.add(floor);

                    // --- Geometry Collision Lines ---
                    // Line definitions relative to the branch's local orientation.
                    // To avoid blocking the center of the V-junction, the inner walls start further down (z1 = -2.5).
                    const leftZ1 = (dir === 'Right') ? -2.5 : 0.1;
                    const rightZ1 = (dir === 'Left') ? -2.5 : 0.1;

                    colRequests.push({ group: branch, x: -2, z1: leftZ1, z2: -branchLength }); // Left Wall Segment
                    colRequests.push({ group: branch, x: 2, z1: rightZ1, z2: -branchLength });  // Right Wall Segment

                    if (!isCorrect) {
                        colRequests.push({ group: branch, isDeadEnd: true, z: -branchLength });
                    }

                    // --- Visual Walls ---
                    // Rule: NEVER add walls that face the camera (acting as "South Walls" obscuring vision).
                    // We check the branch's absolute world angle to drop southern outer walls.

                    if (branchAbsAngleDeg <= 0) { // Keep if 0 (North) or negative (East-ish)
                        // To avoid spikes protruding into the center of the V logic, we shorten the inner-most wall
                        const isInner = (dir === 'Right');
                        const wLen = isInner ? (branchLength - 2.5) : branchLength;
                        const wZ = isInner ? (-branchLength / 2 - 1.25) : (-branchLength / 2);

                        const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, wLen), vWallMat);
                        wallL.position.set(-2, 2.5, wZ);
                        branch.add(wallL);
                    }

                    if (branchAbsAngleDeg >= 0) { // Keep if 0 (North) or positive (West-ish)
                        const isInner = (dir === 'Left');
                        const wLen = isInner ? (branchLength - 2.5) : branchLength;
                        const wZ = isInner ? (-branchLength / 2 - 1.25) : (-branchLength / 2);

                        const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, wLen), vWallMat);
                        wallR.position.set(2, 2.5, wZ);
                        branch.add(wallR);
                    }

                    // Lights & Decorations
                    if (!isCorrect) {
                        const deadEnd = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), vWallMat);
                        deadEnd.position.set(0, 2.5, -branchLength);
                        branch.add(deadEnd);
                    } else if (isLast) {
                        const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x885533 }));
                        exitDoor.position.set(0, 1.75, -branchLength + 0.1);
                        branch.add(exitDoor);

                        const doorLight = new THREE.PointLight(0xffddaa, 1.5, 10);
                        doorLight.position.set(0, 3, -branchLength + 1.0);
                        branch.add(doorLight);

                        colRequests.push({ group: branch, isExitDoor: true, obj: exitDoor, z: -branchLength + 0.1 });
                    }
                });

                // Set up anchor for the next junction loop
                const cAngle = (correctDir === 'Left') ? (Math.PI / 4) : (-Math.PI / 4);
                const nextAnchor = new THREE.Group();
                // Traverse exactly to the end of the correct corridor using local path vector
                nextAnchor.position.set(
                    -L_CORRECT * Math.sin(cAngle),
                    0,
                    -L_CORRECT * Math.cos(cAngle)
                );
                // Rotate the anchor to align with the angle of the path we just took
                nextAnchor.rotation.y = cAngle;

                // Add a small connecting floor to patch the start gap of the NEXT junction
                if (i < sequence.length - 1) {
                    const conn = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), vFloorMat);
                    conn.rotation.x = -Math.PI / 2;
                    // Move it slightly forward to bridge the previous V split
                    conn.position.z = -1.0;
                    nextAnchor.add(conn);
                }

                currentAnchor.add(nextAnchor);
                currentAnchor = nextAnchor;
                currentAbsAngle += cAngle;
            }

            // After building the scene graph for the maze, compute world coordinates.
            startGroup.updateMatrixWorld(true);

            // Populate absolute line-based collisions into the game physics engine
            for (const req of colRequests) {
                if (req.isExitDoor) {
                    const p = new THREE.Vector3(0, 0, req.z);
                    req.group.localToWorld(p);
                    this.interactables.push({ obj: req.obj, name: 'LOOP3_EXIT_DOOR', x: p.x, z: p.z });

                    // Add collision for the exit door so the player can't walk through it
                    const p1 = new THREE.Vector3(-2, 0, req.z);
                    const p2 = new THREE.Vector3(2, 0, req.z);
                    req.group.localToWorld(p1);
                    req.group.localToWorld(p2);
                    this.collisionLines1F.push([p1.x, p1.z, p2.x, p2.z]);

                } else if (req.isDeadEnd) {
                    const p1 = new THREE.Vector3(-2, 0, req.z);
                    const p2 = new THREE.Vector3(2, 0, req.z);
                    req.group.localToWorld(p1);
                    req.group.localToWorld(p2);
                    this.collisionLines1F.push([p1.x, p1.z, p2.x, p2.z]);
                } else {
                    const p1 = new THREE.Vector3(req.x, 0, req.z1);
                    const p2 = new THREE.Vector3(req.x, 0, req.z2);
                    req.group.localToWorld(p1);
                    req.group.localToWorld(p2);
                    this.collisionLines1F.push([p1.x, p1.z, p2.x, p2.z]);
                }
            }

        } else {
            // Normal loops: north wall + front door
            const wallN = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), wallMat);
            wallN.position.set(oX, -7.5, -10);
            this.mapRoot.add(wallN);

            const doorFront = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0505 }));
            doorFront.position.set(oX, -8.25, -9.9);
            this.mapRoot.add(doorFront);
            this.interactables.push({ obj: doorFront, name: 'FRONT_DOOR', x: oX, z: -9.9 });
        }

        // Invisible return point to 2F (South wall area)
        this.interactables.push({ obj: { position: { x: oX, y: -8.25, z: 9.9 } }, name: 'STAIRS_UP_1F', x: oX, z: 9.9 });

        // Update collision
        this.collisionObjects1F = [
            // Left Wall
            [oX - 2.25, oX - 1.75, 4.75, 10],      // Front Left
            [oX - 2.25, oX - 1.75, -5.25, 3.25],   // Mid gap Left
            [oX - 2.25, oX - 1.75, -10, -6.75],    // Back gap Left

            // Right Wall
            [oX + 1.75, oX + 2.25, -5.25, 0],      // Front Right 
            [oX + 1.75, oX + 2.25, -10, -6.75],    // Back Right 
        ];

        // Fill gaps if it's NOT Loop 2
        if (this.loopCount < 2) {
            this.collisionObjects1F.push([oX - 2.25, oX - 1.75, 3.25, 4.75]); // Toilet door gap
            this.collisionObjects1F.push([oX - 2.25, oX - 1.75, -6.75, -5.25]); // Left room door gap
            this.collisionObjects1F.push([oX + 1.75, oX + 2.25, -6.75, -5.25]); // Parents room door gap
        }

        // Toilet Room Walls
        if (this.loopCount === 5 && this.loop4_fridge_checked) {
            const extLen = 15;
            this.collisionObjects1F.push(
                [oX - 5.5 - extLen, oX - 5.0 - extLen, 2.5, 5.5],   // West wall
                [oX - 5.5 - extLen, oX - 2.0, 2.25, 2.75],  // North wall
                [oX - 5.5 - extLen, oX - 2.0, 5.25, 5.75]   // South wall
            );
        } else {
            this.collisionObjects1F.push(
                [oX - 5.5, oX - 5.0, 2.5, 5.5],   // West wall
                [oX - 5.5, oX - 2.0, 2.25, 2.75],  // North wall
                [oX - 5.5, oX - 2.0, 5.25, 5.75]   // South wall
            );
        }

        // Add all other static bounds
        const otherBounds = [
            // Hallway Boundaries (front door wall only for non-loop-3)
            ...(this.loopCount !== 3 ? [[oX - 2, oX + 2, -10.25, -9.75]] : []),
            [oX - 2, oX + 2, 10.0, 10.5],    // Hallway South (Stairs Wall)

            // Living Room Bounds
            [oX + 2, oX + 14, -0.25, 0.25], // North
            [oX + 13.75, oX + 14.25, 0, 10], // East

            // Back-Left Room Bounds
            [oX - 8.25, oX - 7.75, -9, -3], // West
            [oX - 8, oX - 2, -9.25, -8.75], // North
            [oX - 8, oX - 2, -3.25, -2.75], // Invisible South

            // Back-Right Room Bounds (Parents Room)
            [oX + 7.75, oX + 8.25, -9, -3], // East
            [oX + 2, oX + 8, -9.25, -8.75], // North
            [oX + 2, oX + 8, -3.25, -2.75], // Invisible South
            [oX + 4.5, oX + 5.5, -6.5, -5.5], // Parents Room Box

            // Furniture
            [oX + 4, oX + 10, 6.5, 7.5], // Kitchen Counter
            [oX + 12.25, oX + 13.75, 8.5, 9.5], // Fridge
            [oX + 6, oX + 10, 0, 1.2], // TV Stand
            [oX + 5.8, oX + 10.2, 2.6, 4.4], // Sofa
            [oX + 6.8, oX + 9.2, 1.4, 2.6], // Table

            // Left Room Props
            [oX - 7.8, oX - 6.2, -4.8, -3.2], // Box 1
            [oX - 7.9, oX - 6.5, -6.2, -4.8], // Box 2
            [oX - 5.3, oX - 2.7, -8.9, -7.5], // Old Desk

            // Front / Back bounds
            [oX - 2, oX + 14, 9.75, 10.25] // Invisible South boundary (Hall + Kitchen area)
        ];

        this.collisionObjects1F.push(...otherBounds);

    }

    triggerGlitch(duration) {
        document.body.classList.add('glitch');
        const oldIntensity = this.pointLight.intensity;
        this.pointLight.intensity = 0.2;
        setTimeout(() => {
            document.body.classList.remove('glitch');
            this.pointLight.intensity = oldIntensity;
        }, duration);
    }

    checkCollision(newX, newZ) {
        const pR = 0.4; // Player radius

        if (this.currentFloor === "FLAT_WORLD") {
            const bounds = 490;
            if (newX < -bounds || newX > bounds || newZ < -bounds || newZ > bounds) return true;

            if (this.flatWorldHouseGroup) {
                const pt = new THREE.Vector3(newX, 0, newZ);
                this.flatWorldHouseGroup.worldToLocal(pt);
                // Box is 6x6 (x:-3 to 3, z:-3 to 3). Add player radius 0.4 buffer
                if (pt.x > -3.4 && pt.x < 3.4 && pt.z > -3.4 && pt.z < 3.4) return true;
            }

            return false;
        }

        if (this.currentFloor === 1) {
            for (const [minX, maxX, minZ, maxZ] of this.collisionObjects1F) {
                const closestX = Math.max(minX, Math.min(newX, maxX));
                const closestZ = Math.max(minZ, Math.min(newZ, maxZ));
                const distanceX = newX - closestX;
                const distanceZ = newZ - closestZ;
                if ((distanceX * distanceX + distanceZ * distanceZ) < (pR * pR)) {
                    return true;
                }
            }

            // Angled Wall Collision (Loop 3+)
            if (this.collisionLines1F) {
                for (const [x1, z1, x2, z2] of this.collisionLines1F) {
                    const dx = x2 - x1;
                    const dz = z2 - z1;
                    const lenSq = dx * dx + dz * dz;
                    let t = ((newX - x1) * dx + (newZ - z1) * dz) / lenSq;
                    t = Math.max(0, Math.min(1, t));
                    const closestX = x1 + t * dx;
                    const closestZ = z1 + t * dz;
                    const distSq = (newX - closestX) ** 2 + (newZ - closestZ) ** 2;
                    if (distSq < (pR * pR)) return true;
                }
            }
            return false;
        }

        const doorX = this.door.position.x;
        const doorZ = this.door.position.z;
        const drX = this.doorR.position.x;
        const drZ = this.doorR.position.z;

        // AABBs for all solid objects: [minX, maxX, minZ, maxZ]
        const objects = [
            // North Walls (Next to door)
            [-6.0, -0.75, -6.25, -5.75],  // wallN1
            [0.75, 6.0, -6.25, -5.75],    // wallN2

            // Outer Walls
            [-6.25, -5.75, -6.0, 6.0],    // wallW (Boy's room)
            [5.75, 6.25, -6.0, 6.0],      // wallE
            [-6.0, 6.0, 5.75, 6.25],      // Invisible South wall

            // Hallway Walls
            [-2.25, -1.75, -20.0, -13.75], // hwL back
            [-2.25, -1.75, -12.25, -6.0],  // hwL front
            [1.75, 2.25, -20.0, -13.75],  // hwR1
            [1.75, 2.25, -12.25, -6.0],   // hwR2
            [-2.25, 2.25, -21.0, -19.0],  // stairs void bounds

            // Left Room 2F Walls (expanded: X:-2~-10, Z:-10~-16)
            [-10.25, -9.75, -16.0, -10.0], // lrW
            [-10.0, -2.0, -16.25, -15.75], // lrN
            [-10.0, -2.0, -10.25, -9.75],  // lrS (Collision only, no mesh to maintain camera view)

            // Sister's Room Walls
            [2.0, 14.0, -19.25, -18.75],  // srN
            [2.0, 14.0, -7.25, -6.75],    // srS
            [13.75, 14.25, -19.0, -7.0],  // srE

            // Furniture
            [-5.0, -2.0, 0.0, 4.0],       // BED
            [8.75, 11.25, -12.0, -8.0],   // Sister Bed
            [-9.25, -7.75, -15.25, -13.75], // Map Table (2F Left Room)
            [3.5, 5.5, -4.9, -4.1],       // DRESSER_BOY
            [3.0, 5.0, -17.9, -17.1],     // DRESSER_SISTER
            [1.25, 3.75, -5.9, -4.7],     // DESK_BOY
            [2.15, 2.85, -4.15, -3.45],   // CHAIR_BOY
            [-5.9, -5.1, -4.25, -1.75],   // BOOKSHELF_BOY
            [-5.1, -3.9, -5.1, -3.9],     // TOY_BOX
            [13.1, 13.9, -15, -13],       // VANITY_SISTER
            [12.1, 12.9, -10.4, -9.6],    // SIDE_TABLE_SISTER
            [6, 10, -18.9, -18.3],        // BOOKSHELF_SISTER
            [-7.8, -7.2, -13.3, -12.7],   // lrChair
            [-8.9, -8.1, -15.8, -15.2],   // lrCabinet

            // Dynamic Doors
            [doorX - 0.75, doorX + 0.75, doorZ - 0.1, doorZ + 0.1], // Main Door
            [drX - 0.1, drX + 0.1, drZ - 0.75, drZ + 0.75]          // Sister Door
        ];

        // Left door gap: closed unless trap is armed (door visually open) OR escape is ready OR Loop 2+
        if (!this.is2FLeftRoomTrapArmed && !this.is2FEscapeReady && this.loopCount < 2) {
            objects.push([-2.25, -1.75, -13.75, -12.25]); // Left door gap closed
        }

        for (const [minX, maxX, minZ, maxZ] of objects) {
            const closestX = Math.max(minX, Math.min(newX, maxX));
            const closestZ = Math.max(minZ, Math.min(newZ, maxZ));

            const distanceX = newX - closestX;
            const distanceZ = newZ - closestZ;

            if ((distanceX * distanceX + distanceZ * distanceZ) < (pR * pR)) {
                return true;
            }
        }
        return false;
    }

    updatePlayerAndCamera() {
        if (this.gameState !== 'PLAYING') return;

        const speed = 0.06;
        let dx = 0;
        let dz = 0;

        if (this.keys.w) dz -= speed;
        if (this.keys.s) dz += speed;
        if (this.keys.a) dx -= speed;
        if (this.keys.d) dx += speed;

        let newX = this.player.position.x + dx;
        let newZ = this.player.position.z + dz;

        // Slide collision
        if (!this.checkCollision(newX, this.player.position.z)) {
            this.player.position.x = newX;
        } else {
            dx = 0;
        }

        if (!this.checkCollision(this.player.position.x, newZ)) {
            this.player.position.z = newZ;
        } else {
            dz = 0;
        }

        if (dx !== 0 || dz !== 0) {
            const angle = Math.atan2(dx, dz);
            this.player.rotation.y = angle;
        }

        // Update Poro following logic
        this.updatePoro();

        // Handle footsteps sound
        const isMoving = (dx !== 0 || dz !== 0);
        if (isMoving && this.gameState === 'PLAYING') {
            if (this.soundAssets.footstep.paused) {
                this.soundAssets.footstep.play().catch(e => { });
            }
        } else {
            if (!this.soundAssets.footstep.paused) {
                this.soundAssets.footstep.pause();
                this.soundAssets.footstep.currentTime = 0;
            }
        }

        // Camera follow
        const camOffsetX = 0;
        const camOffsetY = 6;
        const camOffsetZ = 6;

        this.camera.position.x += (this.player.position.x + camOffsetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (this.player.position.y + camOffsetY - this.camera.position.y) * 0.1;
        this.camera.position.z += (this.player.position.z + camOffsetZ - this.camera.position.z) * 0.1;

        this.camera.lookAt(this.player.position);

        if (this.currentFloor === 2 && this.stairsWatcher && !this.hasSeenStairsWatcher) {
            const dist = Math.hypot(this.player.position.x - this.stairsWatcher.position.x, this.player.position.z - this.stairsWatcher.position.z);
            // プレイヤーが近づいたらゆっくり消える
            if (dist < 7.0) {
                this.hasSeenStairsWatcher = true;
                let op = 0.25;
                const fade = setInterval(() => {
                    op -= 0.02;
                    this.stairsWatcher.material.opacity = op;
                    if (op <= 0) {
                        clearInterval(fade);
                        this.mapRoot.remove(this.stairsWatcher);
                        this.stairsWatcher = null;
                    }
                }, 50);
            }
        }

        // Loop 3: Trigger corridor chase cinematic when player passes toward the junction area
        if (this.currentFloor === 1 && this.loopCount === 3
            && !this.loop3_1f_cinematic_triggered
            && this.player.position.z < -7) {

            // X座標が廊下の範囲内（98〜102）にいる時だけ発生させる
            if (this.player.position.x > 98 && this.player.position.x < 102) {
                this.triggerLoop3ChaseCinematic();
            }
        }

        // 第2周：2階左の部屋に入った時の異変イベント
        if (this.currentFloor === 2 && this.loopCount === 2 && !this.hasTriggeredLoop2RoomEvent && this.player.position.x < -3) {
            this.hasTriggeredLoop2RoomEvent = true;
            this.showDialogue('……え？ なんで浮いてるの……？', () => {
                // 顔を叩く音（2回連続）を再生
                if (this.soundAssets.slap) {
                    const slap1 = this.soundAssets.slap;
                    slap1.currentTime = 0;
                    slap1.play().catch(e => { });

                    setTimeout(() => {
                        const slap2 = slap1.cloneNode(true);
                        slap2.volume = slap1.volume;
                        slap2.play().catch(e => { });
                    }, 200);
                }
                this.showDialogue('パンパンッ！', () => {
                    this.showDialogue('……なにこれ？ 夢じゃないの……？');
                });
            });
        }

        // 追加：親の部屋に入った時の反応 (1F, X > 102.5, Z < -3.5 & Z > -8.5)
        if (this.currentFloor === 1 && !this.hasCheckedParentsRoom &&
            this.player.position.x > 102.5 && this.player.position.z < -3.5 && this.player.position.z > -8.5) {
            this.hasCheckedParentsRoom = true;
            this.showDialogue('……？ お父さんとお母さんの部屋なのに……何も無い…それに狭い。', () => {
                this.showDialogue('部屋の真ん中に、……箱だけが置いてある。');
            });
        }

        // 第5周：トイレ回廊の途中で妹の呼びかけ
        if (this.currentFloor === 1 && this.loopCount === 5 && this.loop4_fridge_checked && !this.loop5_toilet_warning_triggered) {
            const oX = 100;
            // 回廊の中間あたり(X < 92)を通過したかチェック
            if (this.player.position.x < oX - 8 && this.player.position.z > 2.5 && this.player.position.z < 5.5) {
                this.loop5_toilet_warning_triggered = true;

                this.triggerGlitch(400); // 画面をバグらせる
                if (this.soundAssets.heartbeat) {
                    this.soundAssets.heartbeat.currentTime = 0;
                    this.soundAssets.heartbeat.play().catch(e => { });
                }

                this.showDialogue('（……おにいちゃん、その先には行っちゃだめ……）', () => {
                    this.showDialogue('……', () => {
                        this.showDialogue('あれ…？今何か聞こえたような…', () => {
                            // ▼ 追加：ダイアログ終了後に心音を止める ▼
                            if (this.soundAssets.heartbeat) {
                                this.soundAssets.heartbeat.pause();
                            }
                        });
                    });
                });
            }
        }
    }

    // Maze logic removed as per user request (Simplified Loop 3)

    checkInteractions() {
        if (this.gameState !== 'PLAYING') {
            document.getElementById('interact-notice').style.opacity = '0';
            return;
        }

        this.nearestTarget = null;
        let minDist = 2.0;

        for (const item of this.interactables) {
            const dist = Math.hypot(this.player.position.x - item.x, this.player.position.z - item.z);
            if (dist < minDist) {
                minDist = dist;
                this.nearestTarget = item;
            }
        }

        const notice = document.getElementById('interact-notice');
        if (this.nearestTarget) {
            notice.style.opacity = '1';
        } else {
            notice.style.opacity = '0';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (Math.random() > 0.98 && this.gameState === 'PLAYING') {
            const totalFactor = this.userBrightness * this.sceneBrightness;
            const lightData = this.allLights.find(l => l.light === this.pointLight);
            if (lightData) {
                // ベースの明るさに合わせて揺らす
                this.pointLight.intensity = lightData.baseIntensity * totalFactor * (0.8 + Math.random() * 0.4);
            }
        }

        this.updatePlayerAndCamera();
        this.updateMonster();
        this.updateSisterShadows();
        if (this.checkLoop4Blockers) this.checkLoop4Blockers();
        this.updateFloatingObjects();
        this.checkInteractions();
        this.updateMapMarker();

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    checkLoop4Blockers() {
        if (this.loopCount !== 4 || !this.loop4_blockers || this.loop4_blockers.length === 0) return;

        const blocker = this.loop4_blockers[0];

        if (Math.abs(this.player.position.y - blocker.position.y) < 4.0) {
            const dist = Math.hypot(this.player.position.x - blocker.position.x, this.player.position.z - blocker.position.z);

            if (dist < 4.5 && !this.hasSeenBlockers && this.gameState === 'PLAYING') {
                this.hasSeenBlockers = true;

                this.keys = { w: false, a: false, s: false, d: false, space: false };
                if (this.soundAssets.footstep) this.soundAssets.footstep.pause();

                this.triggerGlitch(500);
                if (this.soundAssets.thud) this.soundAssets.thud.play();

                this.loop4_blockers.forEach(b => {
                    b.material.color.setHex(0xff0000);
                    setTimeout(() => {
                        this.mapRoot.remove(b);
                    }, 200);
                });
                this.loop4_blockers = [];

                setTimeout(() => {
                    this.showDialogue('…！？そこにも何かいた！？');
                }, 500);
            }
        }
    }

    updateFloatingObjects() {
        if (!this.scene) return;
        const time = Date.now() * 0.002;
        this.scene.traverse((obj) => {
            if (obj.isFloating) {
                // Initialize originalY if not set
                if (obj.originalY === undefined) {
                    obj.originalY = obj.position.y;
                }
                // Float much higher (base + 1.2m) and bob more (0.4m amplitude)
                obj.position.y = obj.originalY + 1.2 + Math.sin(time) * 0.4;
            }
        });
    }

    spawnSisterShadow(x, z, name) {
        // X座標が50未満なら2階(Y:0.4)、50以上なら1階(Y:-9.0)に配置
        let yPos = (x < 50) ? 1.0 : -9.0;

        if (name === 'SHADOW_SISTER_ROOM') {
            yPos = 1.7; // ベッドの高さ分だけ上にずらす
        }

        const loader = new THREE.TextureLoader();
        loader.load('./images/sister.png', (texture) => {
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6, alphaTest: 0.1 });
            const shadow = new THREE.Sprite(mat);
            shadow.scale.set(1.4, 2, 1);
            shadow.position.set(x, yPos, z);
            shadow.shadowName = name;
            this.scene.add(shadow);
            this.loop4_shadows.push(shadow);
        });
    }

    updateSisterShadows() {
        if (this.loopCount !== 4 || this.loop4_shadows.length === 0) return;

        for (let i = this.loop4_shadows.length - 1; i >= 0; i--) {
            const shadow = this.loop4_shadows[i];

            // プレイヤーと影のY座標（高さ）が違いすぎる場合は無視する（階層違いの誤判定防止）
            if (Math.abs(this.player.position.y - shadow.position.y) > 4.0) continue;

            const dist = Math.hypot(this.player.position.x - shadow.position.x, this.player.position.z - shadow.position.z);
            if (dist < 4.0) {
                // 接近時に消滅演出
                if (this.gameState === 'PLAYING') {
                    this.triggerGlitch(100);
                    this.scene.remove(shadow);
                    this.loop4_shadows.splice(i, 1);

                    if (shadow.shadowName === 'SHADOW_STAIRS') {
                        this.showDialogue('……あ、あれ？ 今何かいなかった……？', () => {
                            this.showDialogue('1階の方へ降りて行った気がする……。');
                        });
                        // 次の影：1Fの階段下付近
                        setTimeout(() => this.spawnSisterShadow(100, 6, 'SHADOW_1F_HALL'), 800);

                    } else if (shadow.shadowName === 'SHADOW_1F_HALL') {
                        this.showDialogue('…！やっぱり、誰かいる！');
                        // 次の影：リビングの入り口付近
                        setTimeout(() => this.spawnSisterShadow(104, 2, 'SHADOW_LIVING'), 800);

                    } else if (shadow.shadowName === 'SHADOW_LIVING') {
                        this.showDialogue('…また消えた……。');
                    }
                }
            }
        }
    }

    spawnMonster() {
        if (this.monster) {
            this.scene.remove(this.monster);
        }

        // Load the creepy sister monster texture
        const loader = new THREE.TextureLoader();
        loader.load('./images/sister_monster.png', (texture) => {
            const mMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            // Adjusted size: 1.6 wide x 3.2 high (More human-like but still tall)
            const mGeo = new THREE.PlaneGeometry(1.6, 3.2);
            this.monster = new THREE.Mesh(mGeo, mMat);

            // Spawn far from player (initially out of play area)
            // Center is at -8.4, floor is at -10 (3.2 / 2 = 1.6 offset)
            // For loop 3, start the monster off the south end until cinematic activates
            const startZ = this.loopCount === 3 ? 25 : -15;
            this.monster.position.set(100, -8.4, startZ);
            this.scene.add(this.monster);
        });
    }

    updateMonster() {
        if (!this.monster || this.gameState !== 'PLAYING') return;

        // In loop 3: don't chase on 2F, and don't chase before the 1F cinematic
        if (this.loopCount === 3 && this.currentFloor === 2) return;
        if (this.loopCount === 3 && !this.loop3_1f_cinematic_triggered) return;

        // Billboarding: Monster always faces the camera for 2D sprite effect
        this.monster.lookAt(this.camera.position.x, this.monster.position.y, this.camera.position.z);

        // Movement
        let monsterSpeed = 0.035;
        if (this.loopCount === 5) monsterSpeed = 0.05;
        if (this.loopCount >= 6) monsterSpeed = 0.065; // Faster than player (0.06)

        const dx = this.player.position.x - this.monster.position.x;
        const dz = this.player.position.z - this.monster.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.5) {
            this.monster.position.x += (dx / dist) * monsterSpeed;
            this.monster.position.z += (dz / dist) * monsterSpeed;
        }

        // Catch logic
        if (dist < 0.8 && !this.isMonsterCaught) {
            this.onPlayerCaught();
        }

        // Proximity sound
        if (this.soundAssets.heavy_footsteps) {
            const vol = Math.max(0, 1.0 - (dist / 15.0));
            this.soundAssets.heavy_footsteps.volume = vol * this.volume;
            if (this.soundAssets.heavy_footsteps.paused && dist < 12) {
                this.soundAssets.heavy_footsteps.play().catch(e => { });
            }
        }
    }

    onPlayerCaught() {
        this.isMonsterCaught = true;
        this.gameState = 'CAUGHT';
        this.triggerGlitch(1200);

        if (this.loopCount >= 6) {
            // Climax Reconciliation
            setTimeout(() => {
                this.triggerEnding();
            }, 1200);
            return;
        }

        // Scary scream or thud?
        if (this.soundAssets.thud_2f) this.soundAssets.thud_2f.play();

        setTimeout(() => {
            // Reset to the start of the current chase loop
            // If in Loop 3 -> 3. If in Loop 5 -> 5.
            if (this.loopCount === 5) {
                this.loopCount = 4; // Will be incremented to 5 by loopToStart
            } else {
                this.loopCount = 2; // Will be incremented to 3 by loopToStart
            }
            this.isMonsterCaught = false;
            this.loopToStart();
        }, 1200);
    }

    triggerEnding() {
        this.progress = 100.000;
        this.updateProgressUI();
        this.gameState = 'ENDING';
        document.getElementById('ui-container').style.display = 'none';
        document.getElementById('interact-notice').style.display = 'none';

        const fader = this.createFader();
        fader.style.transition = 'opacity 3s ease-in-out';
        fader.style.backgroundColor = '#fff'; // 画面を真っ白に
        fader.style.opacity = '1';

        // エンディング突入時に環境音を止める
        if (this.soundAssets.ambient) this.soundAssets.ambient.pause();
        if (this.soundAssets.chase) this.soundAssets.chase.pause();

        setTimeout(() => {
            this.showDialogue('…………', () => {
                this.showDialogue('…………ばいばい、また遊んでね、おにいちゃん。', () => {
                    this.showDialogue('…………', () => {
                        this.showDialogue('…………パチッ。<br>眩しい光。カーテンの隙間から、朝の太陽が差し込んでいる。', () => {
                            this.showDialogue('「……おはよ。また変な夢でも見たの？」<br>お姉ちゃんの声がした。', () => {
                                this.showDialogue('僕は夢の話をした。<br>お姉ちゃんの部屋の押し入れの奥……そこに、隠された絵があることを。', () => {
                                    // 修正：お姉ちゃんが忘れていたのではなく、隠していた設定にする
                                    this.showDialogue('お姉ちゃんは少し驚いた顔をしたあと、黙って押し入れの奥から古い箱を引っ張り出してきた。', () => {
                                        this.showDialogue('「……お母さんたちが悲しむから、ずっと秘密にしてたんだけどね」', () => {
                                            this.showDialogue('箱の中から出てきたのは、紛れもなくお姉ちゃんが昔描いた一枚の絵と日記帳。', () => {
                                                this.showDialogue('そこには、今の家族と……<br>見たこともない小さな女の子、そしてポロが、みんなで幸せそうに笑っている絵があった。', () => {
                                                    this.showDialogue('……夢の中で見たのと同じだ。', () => {
                                                        this.showDialogue('物音に気づき、お父さんとお母さんが部屋に入ってきた。', () => {
                                                            this.showDialogue('二人はその絵を見た瞬間、時が止まったように立ち尽くした。', () => {
                                                                this.showDialogue('お母さんの目から、大粒の涙がこぼれ落ちた。', () => {
                                                                    this.showDialogue('「……ごめんね。ずっと、あなたたちに言えなくて。<br>……この子は、あなたの妹だったのよ。」', () => {
                                                                        this.showDialogue('お父さんも、震える声で話し始めた。<br>「悲しみから逃れたくて、いなかったことにしようとしてきた。でも……お姉ちゃん、君はちゃんと覚えていたんだね。」', () => {
                                                                            this.showDialogue('「……あの、10月の秋のあの日から、ずっと……」', () => {
                                                                                this.showDialogue('FIN.<br>空は雲一つない青空だった。雨の匂いは、もうどこにもなかった。', () => {
                                                                                    setTimeout(() => {
                                                                                        location.reload();
                                                                                    }, 4000);
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }, 800);
            });
        }, 1000);
    }

    playLoop4To5Transition() {
        this.gameState = 'EVENT';
        this.isCinematicPlaying = true;

        // BGMや足音を一旦停止
        if (this.soundAssets.ambient) this.soundAssets.ambient.pause();
        if (this.soundAssets.footstep) this.soundAssets.footstep.pause();

        // 画面を暗転させる
        const fader = this.createFader();
        fader.style.transition = 'opacity 0.5s ease-in-out';
        fader.style.backgroundColor = '#000';
        fader.style.opacity = '1';

        setTimeout(() => {
            // 完全な暗黒空間（遥か地下）へカメラとプレイヤーを移動
            this.mapRoot.clear();
            this.scene.background = new THREE.Color(0x000000);
            if (this.scene.fog) {
                this.scene.fog.color.setHex(0x000000);
                this.scene.fog.density = 0.05; // 奥が見えないように
            }

            const voidX = 0, voidY = -500, voidZ = 0;
            this.player.position.set(voidX, voidY, voidZ);
            this.camera.position.set(voidX, voidY + 2, voidZ + 5);
            this.camera.lookAt(voidX, voidY + 2, voidZ - 10);

            // 暗転を明けて、完全な真っ暗空間を見せる
            fader.style.transition = 'opacity 1.5s ease-in-out';
            fader.style.opacity = '0';

            setTimeout(() => {
                // 【シーン開始】主人公の独白
                this.showDialogue('……扉の先は、外じゃなかった。真っ暗で、何も見えない。', () => {
                    this.showDialogue('さっきの絵……。僕には、妹ができるはずだった。', () => {
                        this.showDialogue('じゃあ、僕を追いかけてきていた『あれ』は……', () => {
                            this.showDialogue('……？ どこからか、声が聞こえる……？', () => {

                                // 【画面変化：カオスな空間へ】
                                this.triggerGlitch(800);

                                // ノイズ音と心音
                                if (this.soundAssets.noise_rush) {
                                    this.soundAssets.noise_rush.currentTime = 0;
                                    this.soundAssets.noise_rush.play().catch(e => { });
                                }
                                if (this.soundAssets.heartbeat) {
                                    this.soundAssets.heartbeat.loop = true;
                                    this.soundAssets.heartbeat.currentTime = 0;
                                    this.soundAssets.heartbeat.play().catch(e => { });
                                }

                                // 背景を赤黒く変貌させる
                                this.scene.background = new THREE.Color(0x220000);
                                if (this.scene.fog) {
                                    this.scene.fog.color.setHex(0x220000);
                                    this.scene.fog.density = 0.1;
                                }

                                // 不気味な赤い光の明滅
                                const chaosLight = new THREE.PointLight(0xff0000, 3.0, 30);
                                chaosLight.position.set(voidX, voidY + 2, voidZ - 10);
                                this.scene.add(chaosLight);

                                const chaosAnim = setInterval(() => {
                                    chaosLight.intensity = 1.0 + Math.random() * 4.0;
                                    chaosLight.position.x = voidX + (Math.random() - 0.5) * 6;
                                }, 80);

                                // 空間がカオスに変わってから、少し間を置いてテキスト再開
                                setTimeout(() => {
                                    this.showDialogue('うっ……なんだこれ……！？', () => {
                                        this.showDialogue('すごく嫌な感じがする……さっきまでの静けさとは違う、何か『邪悪なもの』が近づいてきている……！', () => {
                                            this.showDialogue('逃げないと……でも、体が動かない……！', () => {

                                                // 謎の声（呼び止め）
                                                this.showDialogue('（……お…い……ん……）', () => {
                                                    this.showDialogue('（……だめ……何かが、…じゃまを…してく…る…）', () => {
                                                        this.showDialogue('え……？ 誰……？ ノイズが酷くて、よく聞き取れない……', () => {
                                                            this.showDialogue('（……行かないで……なんか……おかし…い…）', () => {
                                                                this.showDialogue('頭が……割れそうだ……意識が……遠のいていく……', () => {

                                                                    // 【暗転 → 5周目へ】
                                                                    clearInterval(chaosAnim);
                                                                    this.scene.remove(chaosLight);
                                                                    if (this.soundAssets.heartbeat) this.soundAssets.heartbeat.pause();

                                                                    if (this.soundAssets.noise_rush) {
                                                                        this.soundAssets.noise_rush.pause();
                                                                        this.soundAssets.noise_rush.currentTime = 0;
                                                                    }

                                                                    fader.style.transition = 'opacity 0.2s ease-in';
                                                                    fader.style.backgroundColor = '#000';
                                                                    fader.style.opacity = '1';

                                                                    setTimeout(() => {
                                                                        this.isCinematicPlaying = false;
                                                                        // 5周目開始（ここでループが進行し、カオスな家のマップが構築されます）
                                                                        this.loopToStart();
                                                                    }, 1000);

                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                }, 1500); // 演出の「間」
                            });
                        });
                    });
                });
            }, 1500); // 暗闇を見せる「間」
        }, 500); // 暗転完了待ち
    }

}

new NightmareGame();
