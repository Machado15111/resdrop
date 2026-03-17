import './PhoneCountrySelect.css';

const COUNTRIES = [
  { code: '+55', country: 'BR' },
  { code: '+1', country: 'US' },
  { code: '+44', country: 'GB' },
  { code: '+351', country: 'PT' },
  { code: '+34', country: 'ES' },
  { code: '+33', country: 'FR' },
  { code: '+49', country: 'DE' },
  { code: '+39', country: 'IT' },
  { code: '+81', country: 'JP' },
  { code: '+61', country: 'AU' },
  { code: '+971', country: 'AE' },
  { code: '+91', country: 'IN' },
];

function countryToFlag(countryCode) {
  return countryCode
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

function PhoneCountrySelect({ countryCode, number, onChange }) {
  return (
    <div className="phone-country-select">
      <select
        className="phone-country-code"
        value={countryCode || '+55'}
        onChange={e => onChange({ countryCode: e.target.value, number: number || '' })}
      >
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>
            {countryToFlag(c.country)} {c.code}
          </option>
        ))}
      </select>
      <input
        className="form-input phone-number-input"
        type="tel"
        value={number || ''}
        onChange={e => onChange({ countryCode: countryCode || '+55', number: e.target.value })}
        placeholder="11 99999-9999"
      />
    </div>
  );
}

export default PhoneCountrySelect;
