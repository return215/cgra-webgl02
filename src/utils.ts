export const scaleToBottomLeft = (n: number) => (n * 2 - 1);
export const rgbIntToScale = (n: number) => (n / 255);
export const showDecimalPoints = (n: number, d: number = 2) => ((Math.round(n * 10**(d)) / 10**(d)).toFixed(d));

// rotate array by n index
export const rotateArray = (array: number[], n: number) => array.slice(n).concat(array.slice(0, n));