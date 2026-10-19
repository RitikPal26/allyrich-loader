'use client';

import React, { useRef } from 'react';
import Spline from '@splinetool/react-spline';

export default function Home() {
  const splineRef = useRef<any>(null);
  const canvasPromiseRef = useRef<Promise<HTMLCanvasElement> | null>(null);

  // Cached AR canvas generator
  function getARCanvas(): Promise<HTMLCanvasElement> {
    if (canvasPromiseRef.current) return canvasPromiseRef.current;

    canvasPromiseRef.current = new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 2400;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(canvas);

      // 1. Solid pure black background matching phone frame and image
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // The central white AR emblem is ~360px wide within the 1024x571 original image.
        // Scale so the white emblem spans ~62% of the mobile screen width (sharp & prominent)
        const targetWidth = canvas.width * 1.7;
        const targetHeight = img.height * (targetWidth / img.width);

        const x = (canvas.width - targetWidth) / 2;
        const y = (canvas.height - targetHeight) / 2;

        ctx.drawImage(img, x, y, targetWidth, targetHeight);
        console.log('AR canvas drawn successfully:', { targetWidth, targetHeight, x, y });
        resolve(canvas);
      };
      img.onerror = (e) => {
        console.error('Failed to load /ar-logo.jpg', e);
        resolve(canvas);
      };
      img.src = '/ar-logo.jpg';
    });

    return canvasPromiseRef.current;
  }

  function getScreenMesh(splineApp: any) {
    if (!splineApp) return null;
    return (
      splineApp.findObjectByName('Place your image here 2') ||
      splineApp.findObjectByName('screen') ||
      splineApp.findObjectByName('Screen') ||
      (splineApp.getAllObjects &&
        splineApp.getAllObjects().find(
          (o: any) =>
            o.name === 'Place your image here 2' ||
            (o.name && o.name.toLowerCase().includes('place your image')) ||
            (o.name && o.name.toLowerCase().includes('screen'))
        ))
    );
  }

  async function applyARToScreen(splineApp: any) {
    if (!splineApp) return;

    const screenObj = getScreenMesh(splineApp);
    if (!screenObj || !screenObj.material) {
      console.warn('Screen mesh not ready yet...');
      return;
    }

    // Await the fully drawn AR canvas
    const arCanvas = await getARCanvas();
    const dataUrl = arCanvas.toDataURL('image/jpeg', 0.95);

    // Pause all video elements in document
    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch (e) {}
    });

    const mat = screenObj.material;

    if (mat.layers && Array.isArray(mat.layers)) {
      for (let i = 0; i < mat.layers.length; i++) {
        const layer = mat.layers[i];

        // Layer 1: Hide video ("Put your screen here" video)
        if (layer.type === 'video') {
          layer.visible = false;
          layer.alpha = 0;
          if (layer.texture) {
            if (layer.texture.video) {
              try {
                layer.texture.video.pause();
              } catch (e) {}
            }
            layer.texture.image = arCanvas;
            layer.texture.isVideoTexture = false;
            layer.texture.needsUpdate = true;
          }
        }

        // Layer 0: Texture layer (Base screen)
        if (layer.type === 'texture') {
          layer.visible = true;
          layer.alpha = 1;
          if (typeof layer.updateTexture === 'function') {
            try {
              console.log('Updating layer 0 texture...');
              await layer.updateTexture(dataUrl);
            } catch (e) {
              console.debug('updateTexture layer 0:', e);
            }
          }
          if (layer.texture) {
            layer.texture.image = arCanvas;
            layer.texture.needsUpdate = true;
          }
        }
      }
    }

    if (mat.map) {
      mat.map.image = arCanvas;
      mat.map.isVideoTexture = false;
      mat.map.needsUpdate = true;
    }

    mat.needsUpdate = true;

    // Remove "Built with Spline" watermark
    removeWatermark(splineApp);

    if (splineApp.requestRender) {
      splineApp.requestRender();
    }
    console.log('AR screen successfully mapped onto 3D phone mesh!');
  }

  function removeWatermark(splineApp: any) {
    // 1. Disable WebGL Pipeline Logo Overlay Pass in runtime
    try {
      if (splineApp?._renderer?.pipeline) {
        const pipeline = splineApp._renderer.pipeline;
        if (typeof pipeline.setWatermark === 'function') {
          pipeline.setWatermark(null);
        }
        if (pipeline.logoOverlayPass) {
          pipeline.logoOverlayPass.enabled = false;
        }
      }
    } catch (e) {
      console.debug('Error disabling WebGL watermark pass:', e);
    }

    // 2. Remove any DOM watermark / link badges
    try {
      document.querySelectorAll('a, div, span, button').forEach((el) => {
        const text = (el.textContent || '').trim();
        const href = (el as HTMLAnchorElement).href || '';
        const id = (el.id || '').toLowerCase();
        const className = (typeof el.className === 'string' ? el.className : '').toLowerCase();
        if (
          text.includes('Built with Spline') ||
          text.includes('Made with Spline') ||
          href.includes('spline.design') ||
          id.includes('watermark') ||
          className.includes('watermark')
        ) {
          el.remove();
        }
      });
    } catch (e) {}
  }

  function onLoad(splineApp: any) {
    splineRef.current = splineApp;
    console.log('Spline scene loaded, applying AR screen...');

    removeWatermark(splineApp);
    applyARToScreen(splineApp);

    // Re-apply to guarantee override after WebGL buffers initialize
    setTimeout(() => {
      removeWatermark(splineApp);
      applyARToScreen(splineApp);
    }, 400);

    setTimeout(() => {
      removeWatermark(splineApp);
      applyARToScreen(splineApp);
    }, 1200);

    setTimeout(() => {
      removeWatermark(splineApp);
      applyARToScreen(splineApp);
    }, 2500);
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
      <Spline
        scene="https://prod.spline.design/VVdTRfsKk3fopW3m/scene.splinecode"
        onLoad={onLoad}
        className="w-full h-full"
      />
    </main>
  );
}
