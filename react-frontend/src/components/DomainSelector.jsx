import { LEARNING_DOMAINS } from '../data/coursesData';

export default function DomainSelector({ selectedDomain, onSelectDomain, allCourses = [] }) {
  // Count courses per domain
  const domainCounts = LEARNING_DOMAINS.reduce((acc, d) => {
    acc[d.name] = allCourses.filter(c => (c.domain || c.category || '').toLowerCase() === d.name.toLowerCase()).length;
    return acc;
  }, {});

  return (
    <div className="domain-selection-wrapper">
      <div className="domain-header">
        <div>
          <h3 className="domain-title">Choose Your Learning Domain</h3>
          <p className="domain-subtitle">Select a specialized track to discover relevant courses.</p>
        </div>
        {selectedDomain && (
          <button 
            className="btn-clear-domain"
            onClick={() => onSelectDomain(null)}
          >
            Show All Domains ✕
          </button>
        )}
      </div>

      <div className="domain-grid">
        {LEARNING_DOMAINS.map(domain => {
          const isSelected = selectedDomain === domain.name;
          const count = domainCounts[domain.name] || 0;

          return (
            <div
              key={domain.id}
              className={`domain-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectDomain(isSelected ? null : domain.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDomain(isSelected ? null : domain.name)}
            >
              <div className="domain-card-header">
                <span className="domain-icon">{domain.icon}</span>
                <span className="domain-count-badge">{count} {count === 1 ? 'Course' : 'Courses'}</span>
              </div>
              <h4 className="domain-name">{domain.name}</h4>
              <p className="domain-desc">{domain.description}</p>
              <div className="domain-footer">
                <span className="domain-action">
                  {isSelected ? '✓ Selected' : 'Explore Track →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
