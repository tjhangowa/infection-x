import { Application, Container, Graphics, Text } from 'pixi.js';

export interface VolumeSlider extends Container {
    setValue: (value: number) => void;
    getValue: () => number;
}

export function createVolumeSlider(
    app: Application,
    label: string,
    width: number,
    height: number,
    initialValue: number
): VolumeSlider {
    const slider = new Container() as VolumeSlider;
    const trackWidth = width;
    const trackHeight = 8;
    const handleSize = 20;
    const trackY = height / 2;

    const trackBG = new Graphics();
    trackBG.beginFill(0x2A2A2A, 1)
        .drawRoundedRect(0, trackY - trackHeight/2, trackWidth, trackHeight, 4)
        .endFill();
    slider.addChild(trackBG);

    const trackFill = new Graphics();
    slider.addChild(trackFill);

    const handle = new Graphics();
    handle.beginFill(0xFFD700, 1)
        .drawCircle(0, trackY, handleSize / 2)
        .endFill();
    handle.lineStyle(3, 0xFFFFFF, 1)
        .drawCircle(0, trackY, handleSize / 2);
    slider.addChild(handle);

    const labelText = new Text(label, {
        fontFamily: 'GameFont',
        fontSize: 28,
        fill: '#E1D3AE',
        letterSpacing: 2,
    });
    labelText.anchor.set(0, 0.5);
    labelText.x = 0;
    labelText.y = trackY - 30;
    slider.addChild(labelText);

    const valueText = new Text('100', {
        fontFamily: 'GameFont',
        fontSize: 24,
        fill: '#C9C3AF',
        letterSpacing: 1,
    });
    valueText.anchor.set(1, 0.5);
    valueText.x = trackWidth;
    valueText.y = trackY - 30;
    slider.addChild(valueText);

    let value = Math.max(0, Math.min(100, initialValue));
    let isDragging = false;

    function updateVisuals() {
        const handleX = (value / 100) * trackWidth;
        handle.x = handleX;

        trackFill.clear();
        trackFill.beginFill(0xFFD700, 0.6)
            .drawRoundedRect(0, trackY - trackHeight/2, handleX, trackHeight, 4)
            .endFill();

        valueText.text = Math.round(value).toString();
    }

    updateVisuals();

    const hitArea = new Graphics();
    hitArea.beginFill(0xFFFFFF, 0.01)
        .drawRect(-10, 0, trackWidth + 20, height)
        .endFill();
    slider.addChild(hitArea);
    slider.eventMode = 'static';
    slider.cursor = 'pointer';

    slider.on('pointerdown', (e: any) => {
        isDragging = true;
        const localPos = slider.toLocal(e.global);
        value = Math.max(0, Math.min(100, (localPos.x / trackWidth) * 100));
        updateVisuals();
    });

    slider.on('pointermove', (e: any) => {
        if (isDragging) {
            const localPos = slider.toLocal(e.global);
            value = Math.max(0, Math.min(100, (localPos.x / trackWidth) * 100));
            updateVisuals();
        }
    });

    slider.on('pointerup', () => {
        isDragging = false;
    });

    slider.on('pointerupoutside', () => {
        isDragging = false;
    });

    const globalMove = (e: MouseEvent) => {
        if (isDragging) {
            const rect = app.canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const globalPos = { x: canvasX, y: e.clientY - rect.top };
            const localPos = slider.toLocal(globalPos);
            value = Math.max(0, Math.min(100, (localPos.x / trackWidth) * 100));
            updateVisuals();
        }
    };

    slider.on('added', () => {
        window.addEventListener('mousemove', globalMove);
        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    });

    slider.setValue = (val: number) => {
        value = Math.max(0, Math.min(100, val));
        updateVisuals();
    };

    slider.getValue = () => value;

    return slider;
}

