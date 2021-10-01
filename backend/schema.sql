
create table ingredients (
    ingredient text primary key,
    source text not null,
    description text,
    category text,
    alcohol numeric,
    image_url text,
    related text[]
)

-- where to buy ingredients, price, ingredient image, etc
create table ingredient_sources (
    id serial primary key,
    ingredient text not null references ingredients (ingredient),
    source text not null,
    link text not null,
    unique (ingredient, source)
)

create table glasses (
    glass text primary key,
    source text not null,
    description text,
    used_for text[],
    size text,
    image_url text,
    image_s3_bucket text,
    image_s3_key text
)

-- drink ingredients in different table
create table drinks (
    drink text primary key,
    source text not null,
    glass text references glasses (glass), -- can be null, sometimes drink is unknown
    category text,
    alcoholic boolean,
    instructions text,
    comments text,
    source_avg_rating numeric,
    source_rating_count integer,
    source_contributor text,
    image_s3_bucket text,
    image_s3_key text
)

-- special field cases:
    -- units === null && quantity === 'fill': last ingredient, fill glass 
    -- units === null && quantity !== 'fill' && quantity !== null: implicit units (ingredient = egg white) OR juiced item, unit are item itself (1/2 juiced orange = 0.5 orange_juice)
    -- units === null && quantity === null: nonspecific ingredient (ice)
create table drink_ingredients (
    id serial primary key,
    drink text not null references drinks (drink),
    ingredient text not null references ingredients (ingredient),
    premods text[],
    postmods text[],
    quantity text,
    units text,
    unique (drink, ingredient, premods, postmods)
)

----- scraping verification -----

--- glasses ---
-- check all
select glass, description, used_for, size from glasses order by glass;

--- ingredients ---
-- check by category, related count
select category, count(*) from ingredients group by category order by count(*) desc;
select array_length(related, 1) as related_count, count(*) from ingredients group by array_length(related, 1) order by array_length(related, 1) desc;
-- check suspicious (unknown category, unknown alcohol, no related)
select ingredient, category, description, alcohol, related from ingredients where category = 'other_/_unknown';
select round(alcohol, 1) as rounded_alcohol, count(*) from ingredients group by round(alcohol, 1) order by round(alcohol, 1) desc
select ingredient, category, description, alcohol from ingredients where array_length(related, 1)  is null;
-- check all names
select ingredient from ingredients order by ingredient;

--- drinks ---
-- check by glass, category, alcoholic, ingredient count, ratings, contributor
select glass, count(*) from drinks group by glass order by count(*) desc;
select category, count(*) from drinks group by category order by count(*) desc;
select alcoholic, count(*) from drinks group by alcoholic order by count(*) desc;
with ingredient_counts as (
    select drinks.drink, count(*) as ingredient_count from drinks join drink_ingredients on drinks.drink = drink_ingredients.drink group by drinks.drink order by drinks.drink
) select ingredient_count, count(*) as drinks from ingredient_counts group by ingredient_count order by ingredient_count desc;
with rounded_ratings as (
    select drink, round(source_avg_rating) as rating from drinks
) select rating, count(*) from rounded_ratings group by rating order by rating desc
with rounded_rating_counts as (
    select drink, round(source_rating_count, -2) as ratings from drinks
) select ratings, count(*) from rounded_rating_counts group by ratings order by ratings desc
with contributors as (
    select source_contributor, count(*) as contributions from drinks group by source_contributor
) select contributions, count(*) from contributors group by contributions order by contributions desc
select source_contributor, count(*) as contributions from drinks group by source_contributor having count(*) >= 5 order by count(*) desc
-- check suspicious: no glass, no instructions, no ratings
select drinks.drink, array_agg(drink_ingredients.ingredient) as ingredients from drinks join drink_ingredients on drinks.drink = drink_ingredients.drink where drinks.glass is null group by drinks.drink order by drinks.drink
select drinks.drink, array_agg(drink_ingredients.ingredient) as ingredients from drinks join drink_ingredients on drinks.drink = drink_ingredients.drink where drinks.instructions is null group by drinks.drink order by drinks.drink
select drinks.drink, array_agg(drink_ingredients.ingredient) as ingredients from drinks join drink_ingredients on drinks.drink = drink_ingredients.drink where drinks.source_rating_count = 0 group by drinks.drink order by drinks.drink

--- drink ingredients ---
-- check all distinct quantities, units
select distinct quantity from drink_ingredients order by quantity
select distinct units from drink_ingredients order by units
-- check suspicious: null quanity, null units, qunaity = 'fill', no ratings
select drink, ingredient, premods, postmods, quantity, units from drink_ingredients where quantity is null order by ingredient
select drink, ingredient, premods, postmods, quantity, units from drink_ingredients where units is null and quantity != 'fill' order by ingredient, premods, postmods
select drink, ingredient, premods, postmods, quantity, units from drink_ingredients where quantity = 'fill' order by ingredient
-- check all mods
select drink, premods, ingredient from drink_ingredients where array_length(premods, 1) > 0 order by premods, ingredient
select drink, ingredient, postmods from drink_ingredients where array_length(postmods, 1) > 0 order by postmods, ingredient
select premod, array_agg(distinct ingredient) as ingredients, count(*) from (select ingredient, unnest(premods) as premod from drink_ingredients) unnested_mods group by premod order by count(*) desc
select postmod, array_agg(distinct ingredient) as ingredients, count(*) from (select ingredient, unnest(postmod) as postmod from drink_ingredients) unnested_mods group by postmod order by count(*) desc