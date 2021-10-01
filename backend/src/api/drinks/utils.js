/*
  drinks api utils
*/

const _ = require('lodash')
const backendUtils = require('../../../utils/utils')

const MAX_INGREDIENT_DISTANCE = 15

const ingredientMap = function(baseIngredient, allIngredients) {
  const allIngredientsMap = _.fromPairs(_.map(allIngredients, ingredient => [ingredient.ingredient, ingredient]))
  let result = {}

  let frontier = [baseIngredient], round = 0
  while (frontier.length > 0) {
    _.forEach(frontier, frontierIngredient => {
      if (result[frontierIngredient.ingredient] === null || result[frontierIngredient.ingredient] === undefined) result[frontierIngredient.ingredient] = round
    })

    frontier = _.chain(frontier)
      .map('related')
      .flatten()
      .map(relatedIngredientName => allIngredientsMap[relatedIngredientName])
      .uniq()
      .filter(ingredient => ingredient !== null && ingredient !== undefined && !result[ingredient.ingredient])
      .value()
    round += 1
  }

  return result
}

const ingredientDistance = function(otherIngredient, ingredientMap) {
  return ingredientMap[otherIngredient.ingredient] === null || ingredientMap[otherIngredient.ingredient] === undefined ? 
    MAX_INGREDIENT_DISTANCE :
    _.min([ingredientMap[otherIngredient.ingredient], MAX_INGREDIENT_DISTANCE])
}

// _ingredientMap is updated by reference for reuse in subsequent calls
const drinkDistance = function(baseDrink, otherDrink, allIngredients, _ingredientMap={}) {
  return _.chain(baseDrink.reciepe)
    .map(baseIngredient => {
      return _.chain(otherDrink.reciepe)
        .map(otherIngredient => {
          if (!_ingredientMap[baseIngredient.ingredient]) _ingredientMap[baseIngredient.ingredient] = ingredientMap(baseIngredient.ingredient_info, allIngredients)
          return ingredientDistance(otherIngredient, _ingredientMap[baseIngredient.ingredient])
        })
        .min()
        .value()
    })
    .mean()
    .value()
}

const drinkSummary = function(drinkInfo) {
  return {
    ..._.pick(drinkInfo, ['drink', 'glass', 'category', 'alcoholic', /*'source_avg_rating', 'source_rating_count'*/]),
    reciepe : _.map(drinkInfo.reciepe, 'ingredient')
  }
}

module.exports = {
  ingredientMap,
  ingredientDistance,
  drinkDistance,
  drinkSummary
}