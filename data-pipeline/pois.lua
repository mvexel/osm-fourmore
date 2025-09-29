
-- Import the POI mapping table from the generated file
local poi_mapping = require('poi_mapping')

-- Create a lookup table for faster matching
local poi_lookup = {}
for _, category in ipairs(poi_mapping) do
    for _, match in ipairs(category.matches) do
        local key = match[1][1]
        local value = match[1][2]
        if not poi_lookup[key] then
            poi_lookup[key] = {}
        end
        poi_lookup[key][value] = category.class
    end
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
            if poi_lookup[key][value] then
                return { class = poi_lookup[key][value] }
            elseif poi_lookup[key]['*'] then
                return { class = poi_lookup[key]['*'] }
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
