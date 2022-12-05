const gpsCoord = { la: 41.512864, lo: -8.779802 };

export function parseDate(dateString) {
	const deli = dateString.includes('/') ? '/' : '-';
	const dateParts = dateString.split(' ')[0].split(deli);

	if (dateParts[0].length === 4) {
		return new Date(+dateParts[0], +dateParts[1] - 1, +dateParts[2]);
	}
	return new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]);
}

export function getDist(entryInfo) {
	if (entryInfo.details['GPS Latitude'] && entryInfo.details['GPS Longitude']) {
		const dist = distance(
			entryInfo.details['GPS Latitude'],
			entryInfo.details['GPS Longitude'],
			gpsCoord.la,
			gpsCoord.lo
		);
		entryInfo.distance = dist;
	} else {
		entryInfo.distance = -1;
		console.warn(
			'WARN - The following entry does not have gps',
			entryInfo.link
		);
	}
}

export function distance(lat1, lon1, lat2, lon2) {
	// The math module contains a function
	// named toRadians which converts from
	// degrees to radians.
	lon1 = (lon1 * Math.PI) / 180;
	lon2 = (lon2 * Math.PI) / 180;
	lat1 = (lat1 * Math.PI) / 180;
	lat2 = (lat2 * Math.PI) / 180;

	// Haversine formula
	let dlon = lon2 - lon1;
	let dlat = lat2 - lat1;
	let a =
		Math.pow(Math.sin(dlat / 2), 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

	let c = 2 * Math.asin(Math.sqrt(a));

	// Radius of earth in kilometers. Use 3956
	// for miles
	let r = 6371;

	// calculate the result
	return c * r;
}
