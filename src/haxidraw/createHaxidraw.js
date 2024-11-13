import { createComsManager } from './createComsManager.js'
import { floatsToBytes, uint16ToBytes, intsToBytes } from './converters.js'

export async function createHaxidraw(comsBuffer) {
  const port = await createComsManager(comsBuffer)

  async function goTo(x, y) {
    const starTime = performance.now();
    const bytes = floatsToBytes([x, y])
    await port.send('go', bytes)
  }

  // async function setAccel(val) {
  //   const bytes = floatsToBytes([ val ]);
  //   await port.send("accel", bytes);
  // }

  // async function setMaxSpeed(val) {
  //   const bytes = floatsToBytes([ val ]);
  //   await port.send("speed", bytes);
  // }

  async function servo(angle) {
    const bytes = intsToBytes([angle])
    await port.send('servo', bytes)
  }

  async function drawPath(path) {
    for (const point of path) {
        await goTo(point.x, point.y);
    }
}

/**
 * Moves the pen to the origin (0,0).
 */
async function setOrigin() {
    await goTo(0, 0);
}

return {
    port,
    goTo,
    servo,
    drawPath,
    setOrigin
};
}

