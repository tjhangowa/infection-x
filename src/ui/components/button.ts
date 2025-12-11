import { Application, Container, Graphics, Text, BlurFilter } from 'pixi.js';

export interface TextButton extends Container {
    labelText: Text;
    setLabel: (text: string) => void;
    setFontSize: (size: number) => void;
}

export function createTextButton(
    app: Application,
    label: string,
    width: number,
    height: number,
    onClick: () => void
): TextButton {
    const root = new Container() as TextButton;
    const bg = new Graphics();
    const glow = new Graphics();
    const txtShadow = new Text(label, {
        fontFamily: 'GameFont',
        fontSize: 40,
        fill: '#000000',
        letterSpacing: 2,
    });
    const txt = new Text(label, {
        fontFamily: 'GameFont',
        fontSize: 40,
        fill: '#E1D3AE',
        letterSpacing: 2,
        dropShadow: {
            color: '#000000ff',
            alpha: 0.8,
            blur: 0,
            angle: Math.PI / 4,
            distance: 6,
        },
    });
    txt.anchor.set(0.5);
    txtShadow.anchor.set(0.5);
    txtShadow.x = 1;
    txtShadow.y = 1;

    glow.filters = [new BlurFilter({ strength: 20, quality: 5 })];
    glow.alpha = 0;
    glow.blendMode = 'add';

    const state = { hover: false, t: 0 };

    function draw() {
        bg.clear();
        glow.clear();
        const baseColor = 0x314B1B;
        const borderColor = 0xFFD700;
        const p = state.t;
        const borderAlpha = p;
        const fillAlpha = 1;
        const radius = 11;

        bg.beginFill(baseColor, fillAlpha)
            .drawRoundedRect(-width/2, -height/2, width, height, radius)
            .endFill();

        if (p > 0.001) {
            bg.lineStyle(5 + 2 * p, borderColor, borderAlpha)
                .drawRoundedRect(-width/2, -height/2, width, height, radius);
        }

        if (p > 0) {
            const glowExp = 14 + 20 * p;
            glow.beginFill(0x111111, 0.25 * p)
                .drawRoundedRect(-width/2 - glowExp/2, -height/2 - glowExp/2, width + glowExp, height + glowExp, radius + 6)
                .endFill();
            glow.alpha = p;
        } else {
            glow.alpha = 0;
        }
        txtShadow.alpha = 0.4 + 0.4 * p;
        txt.scale.set(1 + 0.02 * p);
    }
    draw();

    root.addChild(glow, bg, txtShadow, txt);
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.on('pointerover', () => {
        state.hover = true;
    });
    root.on('pointerout', () => {
        state.hover = false;
    });
    root.on('pointerdown', () => onClick());

    app.ticker.add(() => {
        const target = state.hover ? 1 : 0;
        state.t += (target - state.t) * 0.18;
        if (Math.abs(target - state.t) < 0.001) {
            state.t = target;
        }
        draw();
    });

    root.labelText = txt;
    root.setLabel = (text: string) => { txt.text = text; txtShadow.text = text; };
    root.setFontSize = (size: number) => { txt.style.fontSize = size; txtShadow.style.fontSize = size; };
    return root;
}

