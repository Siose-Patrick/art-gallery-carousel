window.addEventListener("load", () => {
    const lenis = new Lenis();
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const images = [];
    let loadedImagesCount = 0;

    function compressImage(img, quality = 0.5) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            const compressedImg = new Image();
            compressedImg.onload = function() {
                const originalSize = img.src.length * 0.75;
                const compressedSize = compressedDataUrl.length * 0.75;
                const reduction = ((1 - compressedSize/originalSize) * 100).toFixed(1);
                
                console.log(`Image compressed: ${reduction}% reduction`);
                resolve(compressedImg);
            };
            compressedImg.src = compressedDataUrl;
        });
    }

    async function loadImage() {
        for (let i = 0; i < 7; i++) {
            const img = new Image();
            
            img.onload = async function() {
                try {
                    const compressedImg = await compressImage(img, 0.5);
                    images.push(compressedImg);
                } catch (error) {
                    console.log(`Compression failed for image ${i}, using original`);
                    images.push(img);
                }
                
                loadedImagesCount++;
                if (loadedImagesCount === 7) {
                    initializeScene();
                }
            };
            
            img.onerror = function() {
                console.log(`Image ${i} failed to load, using placeholder`);
                const placeholder = new Image();
                placeholder.width = 800;
                placeholder.height = 600;
                images.push(placeholder);
                
                loadedImagesCount++;
                if (loadedImagesCount === 7) {
                    initializeScene();
                }
            };
            
            img.src = `./public/assets/images/img${i}.jpg`;
        }
    }

    function initializeScene() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

        const renderer = new THREE.WebGLRenderer({ 
            canvas: document.querySelector("canvas"), 
            antialias:true,
            powerPreference: "high-performance",
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 1);

        const parentWidth = 20;
        const parentHeight = 75;
        const curvature = 35;
        const segmentsX = 200;
        const segmentsY = 200;

        const parentGeometry = new THREE.PlaneGeometry(parentWidth, parentHeight, segmentsX, segmentsY);

        const positions = parentGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const distanceFromCenter = Math.abs(y) / (parentHeight / 2);
            positions[i + 2] = Math.pow(distanceFromCenter, 2) * curvature;
        }
        parentGeometry.computeVertexNormals();

        const totalSlides = 7;
        const slideHeight = 15;
        const gap = 0.5;
        const cycleHeight = totalSlides * (slideHeight + gap);

        const textureCanvas = document.createElement("canvas");
        const ctx = textureCanvas.getContext("2d", {
            alpha: false,
            willReadFrequently: false
        });

        textureCanvas.width = 2048;
        textureCanvas.height = 8192;

        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        const parentMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            side: THREE.DoubleSide
        });

        const parentMesh = new THREE.Mesh(parentGeometry, parentMaterial);
        parentMesh.position.set(0, 0, 0);
        parentMesh.rotation.x = THREE.MathUtils.degToRad(-20);
        parentMesh.rotation.y = THREE.MathUtils.degToRad(20);
        scene.add(parentMesh);

        const distance = 17.5;
        const heightOffset = 5;
        const offsetx = distance * Math.sin(THREE.MathUtils.degToRad(20));
        const offsetz = distance * Math.cos(THREE.MathUtils.degToRad(20));

        camera.position.set(offsetx, heightOffset, offsetz);
        camera.lookAt(0, -2, 0);
        camera.rotation.z = THREE.MathUtils.degToRad(-5);

        const slideTitles = [
            "Ninomae Ina'nis",
            "Dreamscape",
            "Frieren",
            "Chainsaw",
            "Red Reversal",
            "Photoshop #1",
            "Photoshop #2"
        ];

        function getSlideIndex(loopIndex) {
            let index = loopIndex % totalSlides;
            if (index < 0) index += totalSlides;
            return index;
        }

        function updateTexture(offset = 0) {    
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

            const fontSize = 180;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const extraSlides = 2;
            
            for (let i = -extraSlides; i < totalSlides + extraSlides; i++) {
                let slideY = -i * (slideHeight + gap);
                slideY += offset * cycleHeight;

                const textureY = slideY / cycleHeight * textureCanvas.height;
                let wrappedY = textureY % textureCanvas.height;
                if (wrappedY < 0) wrappedY += textureCanvas.height;

                const slideIndex = getSlideIndex(i);
                
                const slideRect = {
                    x: textureCanvas.width * 0.05,
                    y: wrappedY,
                    width: textureCanvas.width * 0.9,
                    height: (slideHeight/cycleHeight) * textureCanvas.height,
                };

                const img = images[slideIndex];
                
                if (img && img.width) {
                    const imgAspect = img.width / img.height;
                    const rectAspect = slideRect.width / slideRect.height;

                    let drawWidth, drawHeight, drawX, drawY;
                    if (imgAspect > rectAspect) {
                        drawHeight = slideRect.height;
                        drawWidth = drawHeight * imgAspect;
                        drawX = slideRect.x + (slideRect.width - drawWidth) / 2;
                        drawY = slideRect.y;
                    } else {
                        drawWidth = slideRect.width;
                        drawHeight = drawWidth / imgAspect;
                        drawX = slideRect.x;
                        drawY = slideRect.y + (slideRect.height - drawHeight) / 2;
                    }
                    
                    ctx.save();
                    ctx.beginPath();
                    const radius = 20;
                    ctx.roundRect(slideRect.x, slideRect.y, slideRect.width, slideRect.height, radius);
                    ctx.clip();
                    
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    ctx.restore();

                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillText(slideTitles[slideIndex], textureCanvas.width / 2, wrappedY + slideRect.height / 2);

                } else {
                    ctx.fillStyle = "#333333";
                    ctx.fillRect(slideRect.x, slideRect.y, slideRect.width, slideRect.height);
                    
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillText(slideTitles[slideIndex], textureCanvas.width / 2, wrappedY + slideRect.height / 2);
                }
            }
            texture.needsUpdate = true;
        }

        let currentScroll = 0;
        lenis.on("scroll", ({ scroll, limit, velocity, direction, progress }) => {
            currentScroll = progress;
            updateTexture(currentScroll);
            renderer.render(scene, camera);
        });

        let resizeTimeout;
        window.addEventListener("resize", () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                
                updateTexture(currentScroll);
                renderer.render(scene, camera);
            }, 250);
        });

        updateTexture(0);
        renderer.render(scene, camera);
    }

    loadImage();
});