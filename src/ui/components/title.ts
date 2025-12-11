import { Application, Text } from 'pixi.js';

export function createTitle(app: Application): Text {
    const title = new Text('INFECTION \nX', {
        fontFamily: 'GameFont',
        fontSize: 160,
        align: 'center',
        fontWeight: 'bold',
        fill: '#E1D3AE',
        letterSpacing: 7,
        dropShadow: {
            color: '#000000ff',
            alpha: 1,
            blur: 0,
            angle: Math.PI / 4,
            distance: 12,
        },
    });
    app.stage.addChild(title);

    // 8-bit pixel style up/down animation
    const baseTitleY = 24;
    let titleAnimationTime = 0;
    app.ticker.add(() => {
        titleAnimationTime += 0.05;
        const offset = Math.round(Math.sin(titleAnimationTime) * 7);
        title.y = baseTitleY + offset;
    });

    return title;
}

