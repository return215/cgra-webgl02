/** convert bottom left corner space to center clip space */
export const convertCornerToCenter = (n: number) => (n * 2 - 1);

/** scale to 0-1 */
export const rgbIntToScale = (n: number) => (n / 255);

/** show decimal points up to d */
export const showDecimalPoints = (n: number, d: number = 2) => ((Math.round(n * 10**(d)) / 10**(d)).toFixed(d));

/** rotate array by n index */
export const rotateArray = (array: number[], n: number) => array.slice(n).concat(array.slice(0, n));

/** convert degree to radiant */
export const deg2Rad = (degrees: number) => (degrees * Math.PI) / 180;