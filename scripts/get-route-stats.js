function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getDistanceBetweenPoints(lat1, lng1, lat2, lng2) {
  // The radius of the planet earth in meters
  let R = 6378137;
  let dLat = degreesToRadians(lat2 - lat1);
  let dLong = degreesToRadians(lng2 - lng1);
  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat1)) *
      Math.sin(dLong / 2) *
      Math.sin(dLong / 2);

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;

  return distance;
}

export const getRouteStats = (coords) => {
  const { distance, totalGain, totalLoss } = coords.reduce(
    (acc, current) => {
      if (acc.last) {
        acc.distance += getDistanceBetweenPoints(
          acc.last[1],
          acc.last[0],
          current[1],
          current[0],
        );

        const diff = current[2] - acc.last[2];
        if (diff > 0) {
          acc.totalGain += diff;
        } else {
          acc.totalLoss += Math.abs(diff);
        }
      }

      acc.last = current;
      return acc;
    },
    { last: null, distance: 0, time: 0, totalGain: 0, totalLoss: 0 },
  );

  return { distance, totalGain, totalLoss };
};
