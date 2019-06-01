export const getRange = (rangeMin, rangeMax, targetMin, targetMax, value) => {
    return (((value - rangeMin) / (rangeMax - rangeMin)) * (targetMax - targetMin)) + targetMin;
}