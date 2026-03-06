import geoip from "geoip-lite";

export function getIpLocation(ip: string) {
  const geo = geoip.lookup(ip);

  if (!geo) {
    return {
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
    };
  }

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
  };
}
