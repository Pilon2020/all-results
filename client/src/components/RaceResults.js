import React, { useMemo } from 'react';

function RaceResults({ athlete, groupedResults, showAllYears, setShowAllYears }) {
  // Always define a safe default so hooks are always executed.
  const safeGroupedResults = groupedResults && Object.keys(groupedResults).length > 0 ? groupedResults : {};

  // Normalize the time value.
  // Accepts a string in the format "HH:MM:SS" or a number representing total seconds.
  const parseTimeToSeconds = (timeValue) => {
    if (timeValue == null) return Infinity;
    if (typeof timeValue === 'number') return timeValue;
    if (typeof timeValue !== 'string') return Infinity;
    const parts = timeValue.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Compute yearly PRs and overall best records for both Regular and Draft Legal races.
  // NOTE: We now use the draftLegal property as set in Athlete.js.
  const { computedYearlyPRs, computedAllTimeRecords } = useMemo(() => {
    if (Object.keys(safeGroupedResults).length === 0) {
      return {
        computedYearlyPRs: {},
        computedAllTimeRecords: { regular: {}, draftLegal: {} },
      };
    }

    const yearlyPRs = {};
    const allTimeRecords = { regular: {}, draftLegal: {} };

    Object.keys(safeGroupedResults).forEach((year) => {
      yearlyPRs[year] = { regular: {}, draftLegal: {} };
      Object.keys(safeGroupedResults[year]).forEach((distance) => {
        // For Regular races, filter out items where r.draftLegal is truthy.
        const regularResults = safeGroupedResults[year][distance].filter(
          (r) => !r.draftLegal
        );
        if (regularResults.length > 0) {
          const bestRegular = regularResults.reduce((best, current) => {
            const bestSecs = best ? parseTimeToSeconds(best.Total_Time) : Infinity;
            const currSecs = parseTimeToSeconds(current.Total_Time);
            return currSecs < bestSecs ? current : best;
          }, null);
          yearlyPRs[year].regular[distance] = bestRegular;

          if (
            !allTimeRecords.regular[distance] ||
            parseTimeToSeconds(bestRegular.Total_Time) <
              parseTimeToSeconds(allTimeRecords.regular[distance].Total_Time)
          ) {
            allTimeRecords.regular[distance] = { ...bestRegular, year };
          }
        }

        // For Draft Legal races, include only items where r.draftLegal is true.
        const draftResults = safeGroupedResults[year][distance].filter(
          (r) => r.draftLegal
        );
        if (draftResults.length > 0) {
          const bestDraft = draftResults.reduce((best, current) => {
            const bestSecs = best ? parseTimeToSeconds(best.Total_Time) : Infinity;
            const currSecs = parseTimeToSeconds(current.Total_Time);
            return currSecs < bestSecs ? current : best;
          }, null);
          yearlyPRs[year].draftLegal[distance] = bestDraft;

          if (
            !allTimeRecords.draftLegal[distance] ||
            parseTimeToSeconds(bestDraft.Total_Time) <
              parseTimeToSeconds(allTimeRecords.draftLegal[distance].Total_Time)
          ) {
            allTimeRecords.draftLegal[distance] = { ...bestDraft, year };
          }
        }
      });
    });

    return { computedYearlyPRs: yearlyPRs, computedAllTimeRecords: allTimeRecords };
  }, [safeGroupedResults]);

  // If there are no grouped results, render the empty state.
  if (Object.keys(safeGroupedResults).length === 0) {
    return (
      <div className="empty-state">
        <p className="no-records">No race results available.</p>
      </div>
    );
  }

  // Sort years in descending order.
  const years = Object.keys(safeGroupedResults)
    .map(Number)
    .sort((a, b) => b - a);
  const recentYears = showAllYears ? years : years.slice(0, 3);

  return (
    <div>
      {recentYears.map((year) => (
        <div key={year} className="year-section">
          <div className="year-header">{year}</div>
          {Object.keys(safeGroupedResults[year])
            .sort()
            .map((distance) => {
              // Use r.draftLegal to separate into Regular and Draft Legal results.
              const regularResults = safeGroupedResults[year][distance].filter(
                (r) => !r.draftLegal
              );
              const draftResults = safeGroupedResults[year][distance].filter(
                (r) => r.draftLegal
              );

              // Sort each subgroup by Total_Time (lowest time first).
              const sortedRegular = [...regularResults].sort(
                (a, b) => parseTimeToSeconds(a.Total_Time) - parseTimeToSeconds(b.Total_Time)
              );
              const sortedDraft = [...draftResults].sort(
                (a, b) => parseTimeToSeconds(a.Total_Time) - parseTimeToSeconds(b.Total_Time)
              );

              return (
                <div key={distance} className="record-section">
                  <h3>{distance}</h3>
                  {/* Render Regular Races */}
                  {sortedRegular.length > 0 && (
                    <div className="regular-section">
                      <h4>Non-Draft Legal</h4>
                      <ul className="race-list">
                        {sortedRegular.map((result) => {
                          const isSeasonBest =
                            computedYearlyPRs[year].regular[distance] &&
                            parseTimeToSeconds(result.Total_Time) ===
                              parseTimeToSeconds(computedYearlyPRs[year].regular[distance].Total_Time);
                          const isAllTimePR =
                            computedAllTimeRecords.regular[distance] &&
                            parseTimeToSeconds(result.Total_Time) ===
                              parseTimeToSeconds(computedAllTimeRecords.regular[distance].Total_Time) &&
                            Number(year) === Number(computedAllTimeRecords.regular[distance].year);
                          return (
                            <a
                              href={`/race/${athlete.Athlete_ID}/${result._id}`}
                              key={result._id}
                              style={{ textDecoration: 'none' }}
                            >
                              <li className="race-item">
                                <div>
                                  <div className="race-title">{result.Race}</div>
                                  <div className="race-details">
                                    <span>
                                      {new Date(result.Date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    {result.Location && <span> • {result.Location}</span>}
                                  </div>
                                </div>
                                <div
                                  className={`race-time ${isAllTimePR ? 'is-pr' : ''} ${
                                    isSeasonBest && !isAllTimePR ? 'is-sr' : ''
                                  }`}
                                  style={{ textAlign: 'right', marginLeft: 'auto' }}
                                >
                                  {isAllTimePR && <span className="pr-badge">PR</span>}
                                  {isSeasonBest && !isAllTimePR && (
                                    <span className="sr-badge">SR</span>
                                  )}
                                  {result.Total_Time || '--:--:--'}
                                </div>
                              </li>
                            </a>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {/* Render Draft Legal Races */}
                  {sortedDraft.length > 0 && (
                    <div className="draft-legal-section">
                      <h4>Draft Legal</h4>
                      <ul className="race-list">
                        {sortedDraft.map((result) => {
                          const isSeasonBest =
                            computedYearlyPRs[year].draftLegal[distance] &&
                            parseTimeToSeconds(result.Total_Time) ===
                              parseTimeToSeconds(computedYearlyPRs[year].draftLegal[distance].Total_Time);
                          const isAllTimePR =
                            computedAllTimeRecords.draftLegal[distance] &&
                            parseTimeToSeconds(result.Total_Time) ===
                              parseTimeToSeconds(computedAllTimeRecords.draftLegal[distance].Total_Time) &&
                            Number(year) === Number(computedAllTimeRecords.draftLegal[distance].year);
                          return (
                            <a
                              href={`/race/${result._id}/${athlete.Athlete_ID}`}
                              key={result._id}
                              style={{ textDecoration: 'none' }}
                            >
                              <li className="race-item">
                                <div>
                                  <div className="race-title">{result.Race}</div>
                                  <div className="race-details">
                                    <span>
                                      {new Date(result.Date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    {result.Location && <span> • {result.Location}</span>}
                                  </div>
                                </div>
                                <div
                                  className={`race-time ${isAllTimePR ? 'is-pr' : ''} ${
                                    isSeasonBest && !isAllTimePR ? 'is-sr' : ''
                                  }`}
                                >
                                  {isAllTimePR && <span className="pr-badge">PR</span>}
                                  {isSeasonBest && !isAllTimePR && (
                                    <span className="sr-badge">SR</span>
                                  )}
                                  {result.Total_Time || '--:--:--'}
                                </div>
                              </li>
                            </a>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ))}
      {years.length > 3 && (
        <div className="year-toggle">
          <button onClick={() => setShowAllYears(!showAllYears)}>
            {showAllYears ? 'Show Recent Years Only' : 'Show All Years'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RaceResults;
