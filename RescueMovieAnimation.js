import * as THREE from 'three';

export function playRescueMovieSequence(game) {
    game.gameState = 'EVENT';
    game.isCinematicPlaying = true;

    // --- 1. 専用スタジオ（遥か上空）へカメラとプレイヤーを移動 ---
    const studioCenter = new THREE.Vector3(0, 1000, 0);

    // 大群と巨大な化け物全体がしっかり収まるように、カメラをさらに高く(Y+20)、さらに後ろ(Z+40)に下げる
    game.camera.position.set(studioCenter.x, studioCenter.y + 20, studioCenter.z + 40);
    const cameraTarget = new THREE.Vector3(studioCenter.x, studioCenter.y + 10, studioCenter.z - 10);
    game.camera.lookAt(cameraTarget);

    // プレイヤーの本体が画面に映り込まないように、カメラの視界外（遥か下）へ隠す
    game.player.position.copy(studioCenter).add(new THREE.Vector3(0, -50, 0));

    // ムービー専用の床（緑のワイヤーフレーム）を作成
    const planeGeo = new THREE.PlaneGeometry(200, 200, 10, 10);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.2 });
    const studioFloor = new THREE.Mesh(planeGeo, planeMat);
    studioFloor.rotation.x = -Math.PI / 2;
    studioFloor.position.copy(studioCenter);
    game.scene.add(studioFloor);

    // --- 2. 演出用モデルの準備 ---
    const loader = new THREE.TextureLoader();

    // 妹（巨大化）
    const texSister = loader.load('./images/sister_monster.png');
    const matSister = new THREE.SpriteMaterial({ map: texSister, transparent: true, alphaTest: 0.5 });
    const sister = new THREE.Sprite(matSister);
    sister.scale.set(12, 15, 1);
    // カメラのさらに背後（Z+50）からスタートさせる
    sister.position.set(studioCenter.x - 4, studioCenter.y + 7.5, studioCenter.z + 50);

    // ポロ（巨大化）
    game.setupPoro();
    game.poroState = 'FIGHTING';
    const poro = game.poro;
    poro.scale.set(3, 3, 3);
    poro.position.set(studioCenter.x + 4, studioCenter.y + 1.5, studioCenter.z + 50);

    // 敵（カメラの奥に密集させる）
    const enemiesToScatter = [];
    const texEnemy = loader.load('./images/creepy_entity.png');
    const matEnemyTemplate = new THREE.SpriteMaterial({ map: texEnemy, transparent: true, alphaTest: 0.5, color: 0x440000 });

    for (let i = 0; i < 40; i++) {
        const s = new THREE.Sprite(matEnemyTemplate.clone());
        const spreadX = (Math.random() - 0.5) * 40; // 少し横に広げる
        const spreadZ = (Math.random() - 0.5) * 20 - 10; // カメラより奥 (Z: -20 ~ 0)
        s.position.set(studioCenter.x + spreadX, studioCenter.y + 10 + (Math.random() - 0.5) * 2, studioCenter.z + spreadZ);
        s.scale.set(16, 20, 1);
        game.scene.add(s);
        enemiesToScatter.push(s);
    }

    let elapsed = 0;
    let phase = 0;

    // --- 3. アニメーションの進行 ---
    const rAnim = setInterval(() => {
        elapsed += 0.016;

        if (phase === 0) {
            // PHASE 0: 絶望 (1.5秒) - 敵が画面いっぱいにいる、カメラが激しく揺れる
            game.camera.position.x = studioCenter.x + (Math.random() - 0.5) * 1.0;
            game.camera.position.y = studioCenter.y + 20 + (Math.random() - 0.5) * 1.0;
            game.camera.lookAt(cameraTarget); // 揺れている最中もターゲットを向き続ける

            if (elapsed > 1.5) {
                phase = 1; // 予兆
                elapsed = 0;
                game.camera.position.set(studioCenter.x, studioCenter.y + 20, studioCenter.z + 40); // 揺れストップ
                game.camera.lookAt(cameraTarget);
                if (game.soundAssets.bark) game.soundAssets.bark.play();
            }
        }
        else if (phase === 1) {
            // PHASE 1: 予兆 (1.0秒) - 鳴き声だけが響く。敵が少しざわつく
            enemiesToScatter.forEach(s => {
                s.position.x += (Math.random() - 0.5) * 0.1;
            });

            if (elapsed > 1.0) {
                phase = 2; // 登場・突撃
                elapsed = 0;
                game.scene.add(sister); // 妹登場
                if (game.soundAssets.chase) game.soundAssets.chase.play().catch(e => { });
            }
        }
        else if (phase === 2) {
            // PHASE 2: 救援突撃 (カメラの背後から奥の敵へ向かって突進)
            const rushSpeed = 2.0; // 距離が延びたので少しスピードアップ
            sister.position.z -= rushSpeed;
            poro.position.z -= rushSpeed;

            // 敵の群れに到達したか判定 (Z座標が奥まで行ったら)
            if (sister.position.z < studioCenter.z - 5) {
                phase = 3; // 蹴散らし
                elapsed = 0;
                game.triggerGlitch(1500);
            }
        }
        else if (phase === 3) {
            // PHASE 3: 蹴散らしアクション (敵が吹き飛んで消える)
            const chargeSpeed = 1.0;
            sister.position.z -= chargeSpeed;
            poro.position.z -= chargeSpeed;

            enemiesToScatter.forEach(s => {
                // 放射状に吹き飛ぶ
                s.position.z -= 2.0;
                s.position.x += (s.position.x > studioCenter.x ? 1 : -1) * 1.5;
                s.position.y += 1.0;
                s.material.opacity -= 0.1; // 高速消滅
                s.scale.multiplyScalar(1.05);
            });

            if (elapsed > 1.0) {
                phase = 4; // 終了
                game.isCinematicPlaying = false;
                if (game.soundAssets.chase) game.soundAssets.chase.pause();

                // ムービー用のセット（床、妹、ポロ、敵）を全てお片付け
                game.scene.remove(sister);
                game.scene.remove(poro);
                game.scene.remove(studioFloor);
                enemiesToScatter.forEach(s => game.scene.remove(s));

                // 1.2秒の余韻のあとにテキスト表示
                setTimeout(() => {
                    game.showDialogue('……！！<br>犬の鳴き声と一緒に、「何か」が敵を蹴散らした……！', () => {
                        game.showDialogue('あの姿……<br>まさか、ずっと僕を追いかけていた「敵」だと思っていたのは……', () => {
                            game.showDialogue('あの子…？<br>ポロと一緒に、僕を守ってくれていたの？', () => {
                                game.showDialogue('……急に、ひどく疲れてきた。手足に力が入らない。<br>まぶたが重い……。', () => {
                                    clearInterval(rAnim);
                                    const fader = game.createFader();
                                    fader.style.transition = 'opacity 3s ease-in-out';
                                    fader.style.opacity = '1';

                                    setTimeout(() => {
                                        game.loopCount = 5; // 次のループ（第6周）へ
                                        game.loopToStart();
                                    }, 3500);
                                });
                            });
                        });
                    });
                }, 1200);
            }
        }
    }, 16);
}