import React from "react";
import {
  DEFAULT_COUNTRY,
  DEFAULT_TIMEZONE,
  getCountryNames,
  getTimezonesForCountryName,
  resolveTimezoneForCountry,
} from "../lib/countryTimezones";

export type CountryTimezoneFieldsProps = {
  country: string;
  timezone: string;
  onCountryChange: (country: string) => void;
  onTimezoneChange: (timezone: string) => void;
  /** When true, changing country auto-picks a valid timezone (default true). */
  syncTimezoneOnCountryChange?: boolean;
  countryLabel?: string;
  timezoneLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
};

const defaultSelect =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
const defaultLabel = "text-sm font-bold text-slate-700 ml-1";

/**
 * Country + timezone selects. Timezone options are filtered to the selected country.
 */
export function CountryTimezoneFields({
  country,
  timezone,
  onCountryChange,
  onTimezoneChange,
  syncTimezoneOnCountryChange = true,
  countryLabel = "Country",
  timezoneLabel = "Timezone",
  required = false,
  disabled = false,
  className = "grid grid-cols-1 sm:grid-cols-2 gap-6",
  selectClassName = defaultSelect,
  labelClassName = defaultLabel,
}: CountryTimezoneFieldsProps) {
  const countryList = React.useMemo(() => getCountryNames(), []);
  const effectiveCountry = country || DEFAULT_COUNTRY;
  const timezoneList = React.useMemo(
    () => getTimezonesForCountryName(effectiveCountry),
    [effectiveCountry]
  );
  const effectiveTimezone = timezoneList.includes(timezone)
    ? timezone
    : timezoneList[0] || DEFAULT_TIMEZONE;

  // If parent holds a timezone that is invalid for the country, coerce once per country change.
  React.useEffect(() => {
    if (!timezoneList.includes(timezone)) {
      onTimezoneChange(resolveTimezoneForCountry(effectiveCountry, timezone));
    }
    // Intentionally depend on country + list, not the callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parent callbacks often inline
  }, [effectiveCountry, timezoneList.join("|")]);

  const handleCountry = (next: string) => {
    onCountryChange(next);
    if (syncTimezoneOnCountryChange) {
      onTimezoneChange(resolveTimezoneForCountry(next, timezone));
    }
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className={labelClassName}>{countryLabel}</label>
        <select
          required={required}
          disabled={disabled}
          value={effectiveCountry}
          onChange={(e) => handleCountry(e.target.value)}
          className={selectClassName}
        >
          {countryList.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className={labelClassName}>{timezoneLabel}</label>
        <select
          required={required}
          disabled={disabled}
          value={effectiveTimezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          className={selectClassName}
        >
          {timezoneList.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
