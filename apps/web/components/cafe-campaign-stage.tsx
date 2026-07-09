'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AppLocale } from '../lib/locale';

export type StudioMood = 'luxury' | 'bold' | 'warm' | 'minimal';
export type StudioPalette = 'noir-gold' | 'matcha-cream' | 'berry-night' | 'sand-ink';
export type StudioOutput = 'campaign' | 'post' | 'story' | 'menu' | 'banner';

type StageCard = {
  accent: number;
  height: number;
  width: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  rotation: THREE.Euler;
};

const copy = {
  en: {
    eyebrow: 'Cafe launch demo',
    title: 'One post becomes a full campaign.',
    text: 'Post, story, menu, and launch banner unfold from the same design system.',
    cards: [
      { title: 'SIGNATURE LATTE', label: 'POST' },
      { title: 'OPENING NIGHT', label: 'STORY' },
      { title: 'MENU DROP', label: 'MENU' },
      { title: 'GRAND LAUNCH', label: 'BANNER' },
    ],
  },
  ar: {
    eyebrow: 'تجربة إطلاق كافيه',
    title: 'بوست واحد يتحول إلى حملة كاملة.',
    text: 'بوست، ستوري، منيو، وبانر افتتاح يخرجوا من نفس النظام البصري.',
    cards: [
      { title: 'SIGNATURE LATTE', label: 'POST' },
      { title: 'OPENING NIGHT', label: 'STORY' },
      { title: 'MENU DROP', label: 'MENU' },
      { title: 'GRAND LAUNCH', label: 'BANNER' },
    ],
  },
} as const;

const moodCopy = {
  luxury: 'LUXURY',
  bold: 'BOLD',
  warm: 'WARM',
  minimal: 'MINIMAL',
} as const;

const outputCopy = {
  campaign: 'CAMPAIGN',
  post: 'POST',
  story: 'STORY',
  menu: 'MENU',
  banner: 'BANNER',
} as const;

const paletteColors = {
  'noir-gold': {
    primary: 0xf7d17e,
    secondary: 0x7bd8bd,
    third: 0xf08bb0,
    fourth: 0xc68a2d,
    paper: '#fff8e8',
    ink: '#14100c',
  },
  'matcha-cream': {
    primary: 0xbadf9f,
    secondary: 0xf7d17e,
    third: 0x7bd8bd,
    fourth: 0x8f3152,
    paper: '#fbffe8',
    ink: '#10231d',
  },
  'berry-night': {
    primary: 0xf08bb0,
    secondary: 0xf7d17e,
    third: 0x7bd8bd,
    fourth: 0x8f3152,
    paper: '#fff2f8',
    ink: '#180b13',
  },
  'sand-ink': {
    primary: 0xe5c28a,
    secondary: 0x22594b,
    third: 0xc68a2d,
    fourth: 0x7bd8bd,
    paper: '#fff4dc',
    ink: '#17130d',
  },
} as const satisfies Record<
  StudioPalette,
  { primary: number; secondary: number; third: number; fourth: number; paper: string; ink: string }
>;

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function roundedRectShape(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function makeTextTexture({
  title,
  label,
  accent,
  brandName,
  mood,
  paper,
  ink,
}: {
  title: string;
  label: string;
  accent: string;
  brandName: string;
  mood: string;
  paper: string;
  ink: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, paper);
  gradient.addColorStop(0.52, '#e8d8b8');
  gradient.addColorStop(1, ink);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(20, 16, 12, 0.84)';
  context.fillRect(52, 54, 664, 916);

  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.strokeRect(76, 82, 616, 868);

  context.fillStyle = accent;
  context.beginPath();
  context.arc(384, 318, 118, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255, 248, 232, 0.95)';
  context.beginPath();
  context.arc(350, 282, 34, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#fff8e8';
  context.font = '900 54px Arial';
  context.textAlign = 'center';
  context.fillText(label, 384, 160);

  context.font = '900 74px Arial';
  title
    .split(' ')
    .slice(0, 3)
    .forEach((word, index) => {
      context.fillText(word, 384, 584 + index * 78);
    });

  context.font = '900 32px Arial';
  context.fillStyle = accent;
  context.fillText(brandName.toUpperCase().slice(0, 24), 384, 804);

  context.font = '700 28px Arial';
  context.fillStyle = 'rgba(255, 248, 232, 0.68)';
  context.fillText(`${mood} DIRECTION`, 384, 858);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createCard({
  card,
  text,
  brandName,
  mood,
  palette,
}: {
  card: StageCard;
  text: { title: string; label: string };
  brandName: string;
  mood: StudioMood;
  palette: (typeof paletteColors)[StudioPalette];
}) {
  const group = new THREE.Group();
  const shape = roundedRectShape(card.width, card.height, 0.12);
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 5, bevelSize: 0.025, depth: 0.035 });
  geometry.center();

  const texture = makeTextTexture({
    title: text.title,
    label: text.label,
    accent: `#${card.accent.toString(16).padStart(6, '0')}`,
    brandName,
    mood: moodCopy[mood],
    paper: palette.paper,
    ink: palette.ink,
  });
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    metalness: 0.18,
    roughness: 0.42,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(Math.min(card.width, card.height) * 0.24, 0.01, 10, 64),
    new THREE.MeshStandardMaterial({ color: card.accent, emissive: card.accent, emissiveIntensity: 0.32, roughness: 0.28 }),
  );
  rim.position.set(0, card.height * 0.22, 0.035);
  group.add(rim);

  group.position.copy(card.start);
  group.rotation.copy(card.rotation);
  group.userData.texture = texture;

  return group;
}

export function CafeCampaignStage({
  locale,
  brandName,
  mood = 'luxury',
  palette = 'noir-gold',
  output = 'campaign',
}: {
  locale: AppLocale;
  brandName?: string;
  mood?: StudioMood;
  palette?: StudioPalette;
  output?: StudioOutput;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const stageCopy = copy[locale];
  const displayBrand = brandName?.trim() || '3S Cafe';
  const activePalette = useMemo(() => paletteColors[palette], [palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060b0a, 6, 12);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.1, 7.4);

    const cards: StageCard[] = [
      {
        accent: activePalette.primary,
        height: 3.45,
        width: 2.32,
        start: new THREE.Vector3(0, -0.04, 0.3),
        end: new THREE.Vector3(-1.65, 0.18, 0.15),
        rotation: new THREE.Euler(-0.08, -0.34, -0.08),
      },
      {
        accent: activePalette.secondary,
        height: 3.65,
        width: 1.86,
        start: new THREE.Vector3(0.05, -0.08, 0.18),
        end: new THREE.Vector3(0.28, 0.32, -0.35),
        rotation: new THREE.Euler(-0.05, 0.08, 0.05),
      },
      {
        accent: activePalette.third,
        height: 2.9,
        width: 2.2,
        start: new THREE.Vector3(-0.05, -0.14, 0.08),
        end: new THREE.Vector3(1.62, -0.05, -0.05),
        rotation: new THREE.Euler(-0.12, 0.36, 0.1),
      },
      {
        accent: activePalette.fourth,
        height: 1.58,
        width: 3.72,
        start: new THREE.Vector3(0, -0.2, -0.02),
        end: new THREE.Vector3(0.08, -1.36, 0.2),
        rotation: new THREE.Euler(0.12, 0.02, -0.03),
      },
    ];

    const fallbackCardCopy = stageCopy.cards[0];
    const cardGroups = cards.map((card, index) =>
      createCard({
        card,
        text: {
          ...(stageCopy.cards[index] ?? fallbackCardCopy),
          label: output === 'campaign' ? (stageCopy.cards[index] ?? fallbackCardCopy).label : outputCopy[output],
        },
        brandName: displayBrand,
        mood,
        palette: activePalette,
      }),
    );
    cardGroups.forEach((group, index) => {
      group.position.z -= index * 0.018;
      scene.add(group);
    });

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 96),
      new THREE.MeshStandardMaterial({ color: 0x101513, metalness: 0.18, roughness: 0.58, transparent: true, opacity: 0.74 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    floor.receiveShadow = true;
    scene.add(floor);

    const keyLight = new THREE.SpotLight(activePalette.primary, 9, 12, Math.PI / 5, 0.42, 1.2);
    keyLight.position.set(-2.4, 4.2, 3.2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(activePalette.secondary, 2.4, 8);
    fillLight.position.set(2.7, 1.4, 2.8);
    scene.add(fillLight);

    const backLight = new THREE.PointLight(activePalette.third, 1.9, 7);
    backLight.position.set(0.8, -1.8, 3.5);
    scene.add(backLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));

    const pointer = new THREE.Vector2(0, 0);
    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
    };
    container.addEventListener('pointermove', onPointerMove);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let frameId = 0;
    const startedAt = window.performance.now();

    const render = (now: number) => {
      const seconds = (now - startedAt) / 1000;
      const cycle = reducedMotion ? 1 : (seconds % 7.2) / 7.2;
      const unfold = reducedMotion ? 1 : easeInOut(Math.min(1, cycle / 0.62));
      const breathe = Math.sin(seconds * 1.25) * 0.04;

      cardGroups.forEach((group, index) => {
        const card = cards[index];
        if (!card) {
          return;
        }
        const float = Math.sin(seconds * 1.12 + index * 0.9) * 0.055;
        group.position.lerpVectors(card.start, card.end, unfold);
        group.position.y += float + breathe;
        group.rotation.x = card.rotation.x + pointer.y * 0.06 + Math.sin(seconds + index) * 0.012;
        group.rotation.y = card.rotation.y + pointer.x * 0.12 + Math.cos(seconds * 0.7 + index) * 0.018;
        group.rotation.z = card.rotation.z + Math.sin(seconds * 0.56 + index) * 0.012;
      });

      floor.rotation.z = seconds * 0.04;
      camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.045;
      camera.position.y += (0.1 + pointer.y * 0.16 - camera.position.y) * 0.045;
      camera.lookAt(0, -0.18, 0);
      renderer.render(scene, camera);
      setIsReady(true);
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      container.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      cardGroups.forEach((group) => {
        group.traverse((item: THREE.Object3D) => {
          if (item instanceof THREE.Mesh) {
            item.geometry.dispose();
            if (Array.isArray(item.material)) {
              item.material.forEach((material: THREE.Material) => material.dispose());
            } else {
              item.material.dispose();
            }
          }
        });
        const texture = group.userData.texture;
        if (texture instanceof THREE.Texture) {
          texture.dispose();
        }
      });
      floor.geometry.dispose();
      if (Array.isArray(floor.material)) {
        floor.material.forEach((material: THREE.Material) => material.dispose());
      } else {
        floor.material.dispose();
      }
      renderer.dispose();
    };
  }, [activePalette, displayBrand, mood, output, stageCopy.cards]);

  return (
    <div ref={containerRef} className="cafe-stage" data-testid="cafe-3d-stage">
      <canvas ref={canvasRef} className="cafe-stage__canvas" aria-hidden="true" />
      <div className="cafe-stage__fallback" data-ready={isReady}>
        <div className="cafe-stage__fallback-card cafe-stage__fallback-card--post">POST</div>
        <div className="cafe-stage__fallback-card cafe-stage__fallback-card--story">STORY</div>
        <div className="cafe-stage__fallback-card cafe-stage__fallback-card--menu">MENU</div>
      </div>
      <div className="cafe-stage__copy">
        <p>{stageCopy.eyebrow}</p>
        <strong>
          {displayBrand}: {stageCopy.title}
        </strong>
        <span>{stageCopy.text}</span>
      </div>
      <div className="cafe-stage__glow" />
    </div>
  );
}
