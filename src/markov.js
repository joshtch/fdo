// Markov helper functions

import { domain_getValue, domain_toList, THROW } from 'fdlib';

/**
 * If a row has no boolean condition, return it.
 * If the boolean condition of a row is 1, return it.
 * If no row meets these conditions, return the last row.
 *
 * @param {$space} space
 * @param {?} matrix
 * @returns {*}
 */
function markov_getNextRowToSolve(space, matrix) {
  const { vardoms } = space;
  let row;
  for (let i = 0; i < matrix.length; i++) {
    row = matrix[i];
    const boolDomain = vardoms[row._boolVarIndex];
    if (boolDomain === undefined || domain_getValue(boolDomain) === 1) {
      break;
    }
  }

  return row;
}

function markov_createLegend(merge, inputLegend, domain) {
  if (merge) {
    return markov_mergeDomainAndLegend(inputLegend, domain);
  }

  return inputLegend;
}

function markov_mergeDomainAndLegend(inputLegend, domain) {
  let legend;
  if (inputLegend) {
    legend = inputLegend.slice(0);
  } else {
    legend = [];
  }

  const listed = domain_toList(domain);
  for (let i = 0; i < listed.length; ++i) {
    const val = listed[i];
    if (legend.indexOf(val) < 0) {
      legend.push(val);
    }
  }

  return legend;
}

function markov_createProbVector(space, matrix, expandVectorsWith, valueCount) {
  const row = markov_getNextRowToSolve(space, matrix);
  let probVector = row.vector;

  if (expandVectorsWith !== null) {
    // Could be 0
    probVector = probVector ? probVector.slice(0) : [];
    const delta = valueCount - probVector.length;

    if (delta > 0) {
      for (let i = 0; i < delta; ++i) {
        probVector.push(expandVectorsWith);
      }
    }

    return probVector;
  }

  if (!probVector || probVector.length !== valueCount) {
    THROW('E_EACH_MARKOV_VAR_MUST_HAVE_PROB_VECTOR_OR_ENABLE_EXPAND_VECTORS');
  }

  return probVector;
}

export { markov_createLegend, markov_createProbVector };
