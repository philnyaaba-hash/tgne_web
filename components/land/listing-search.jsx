import { GHANA_REGIONS } from '../../lib/ghana-regions';
import { LAND_TYPES } from '../../lib/land-commerce';
import Icon from './icons';

export default function ListingSearch({ filters = {}, action = '/listings', compact = false }) {
  return (
    <form className={compact ? 'ls-search is-compact' : 'ls-search'} action={action} method="get" role="search">
      <div className="ls-search-field ls-search-grow">
        <label htmlFor="land-q">Where or what</label>
        <div className="ls-search-control">
          <Icon name="search" size={17} />
          <input
            id="land-q"
            name="q"
            type="search"
            defaultValue={filters.q || ''}
            placeholder="Region, town or listing name"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="ls-search-field">
        <label htmlFor="land-region">Region</label>
        <select id="land-region" name="region" defaultValue={filters.region || ''}>
          <option value="">All regions</option>
          {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
      </div>
      <div className="ls-search-field">
        <label htmlFor="land-type">Land use</label>
        <select id="land-type" name="landType" defaultValue={filters.landType || ''}>
          <option value="">Any use</option>
          {LAND_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>
      <button type="submit" className="ls-button ls-button-primary">
        Search land
        <Icon name="arrowRight" size={15} />
      </button>
    </form>
  );
}
