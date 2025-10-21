
-- Import the POI mapping table from the generated file
local poi_mapping = require('poi_mapping')

-- Create a lookup table for faster matching
local poi_lookup = {}
local function compute_specificity(match)
    local score = 0
    for _, pair in ipairs(match) do
        if pair[2] ~= '*' then
            score = score + 1
        end
    end
    return score
end

for _, category in ipairs(poi_mapping) do
    for _, match in ipairs(category.matches) do
        local key = match[1][1]
        if not poi_lookup[key] then
            poi_lookup[key] = {}
        end
        table.insert(poi_lookup[key], {
            match = match,
            class = category.class,
            specificity = compute_specificity(match),
        })
    end
end

for _, candidates in pairs(poi_lookup) do
    table.sort(candidates, function(a, b)
        if a.specificity == b.specificity then
            return #a.match > #b.match
        end
        return a.specificity > b.specificity
    end)
end

local function matches_rule(tags, rule)
    for _, pair in ipairs(rule) do
        local key = pair[1]
        local expected = pair[2]
        local value = tags[key]

        if value == nil then
            return false
        end

        if expected ~= '*' and value ~= expected then
            return false
        end
    end

    return true
end

local pois = osm2pgsql.define_table({
    name = 'pois',
    ids = { type = 'any', type_column = 'osm_type', id_column = 'osm_id' },
    columns = {
        { column = 'name' },
        { column = 'class', not_null = true },
        { column = 'tags', type = 'jsonb' },
        { column = 'geom', type = 'point', not_null = true, projection = 4326 },
        { column = 'version', type = 'smallint', not_null = true },
        { column = 'timestamp', sql_type = 'timestamp', not_null = true},
}})

-- Date formatting function
function format_date(ts)
    return os.date('!%Y-%m-%dT%H:%M:%SZ', ts)
end

-- Function to find POI category from mapping
function find_poi_category(object)
    for key, value in pairs(object.tags) do
        if poi_lookup[key] then
            for _, candidate in ipairs(poi_lookup[key]) do
                if matches_rule(object.tags, candidate.match) then
                    return { class = candidate.class }
                end
            end
        end
    end
    return nil
end

-- Main processing function
function process_poi(object)
    -- skip if no name
    if not object.tags.name then
        return {}
    end
    local fields = {
        name = object:grab_tag('name'),
        tags = object.tags,
        version = object.version,
        timestamp = format_date(object.timestamp),
    }

    -- Try to find category using the mapping
    local category = find_poi_category(object)
    if category then
        -- Store the POI category name as the class
        fields.class = category.class
        return fields
    end

    -- Fallback: mark as miscellaneous if it still looks like a POI
    if object.tags.amenity or object.tags.shop or object.tags.leisure or object.tags.tourism then
        fields.class = 'misc'
        return fields
    end

    return {}
end

-- Node processing
function osm2pgsql.process_node(object)
    record = process_poi(object)
    if record.class then
        record.geom = object:as_point()
        pois:insert(record)
    end
end

-- Way processing
function osm2pgsql.process_way(object)
    if object.is_closed and object.tags.building then
        record = process_poi(object)
        if record.class then
            record.geom = object:as_polygon():centroid()
            pois:insert(record)
        end
    end
end
