/*
  ingredient grouping config
    - specifies 'ingredient families' where multiple 'child' ingredients are classified as a subset of another 'parent' ingredient
    - uses:
      1. allow reduced user specificity when specifying desired ingredients
        - user can select parent ingredient and algorithm will include all child ingredients as well
      2. allow substitution of similar ingredients
        - algorithm can swap a specific child ingredient with its parent or other children when appropriate to increase elligible selection

    - format: {
      parent_ingredient_name: "regex matching all family ingredients INCLDUING PARENT"
    }
*/

module.exports = {
  "whiskey": "(whisk(e)?y)|(bourbon)|(rye)|(^scotch$)|(crown_royal)|(george_dickel)|(jack_daniels)|(jim_beam)|(johnnie_walker)|(wild_turkey)",
  "bourbon": "(bourbon)|(jim_beam)|(wild_turkey)",
  "vodka": "(vodka)|(absolut)",
  "gin": "gin$",
  "rum": "(rum$)|(bacardi)",
  "tequila": "(tequila$)|(jose_cuervo)",
  "brandy": "(brandy)|(cognac)|(sherry)",
  "beer": "(beer)|(^ale$)|(corona)|(guinness)|(^lager$)|(stout)",
  "wine": "(wine)|(champagne)|(dubonnet)|(port)|(thunderbird)"
}