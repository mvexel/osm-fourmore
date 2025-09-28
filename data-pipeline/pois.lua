
-- Import the POI mapping table from the generated file
local poi_mapping = require('poi_mapping')

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

-- Function to check if object matches POI mapping criteria
function matches_poi_criteria(object, mapping_tags)
    -- ALL tags in the mapping must match
    for _, tag_pair in ipairs(mapping_tags) do
        local key, value = tag_pair[1], tag_pair[2]
        
        -- Check if the key exists in the object
        if not object.tags[key] then
            return false  -- Required key is missing
        end
        
        -- If mapping value is '*', it means "any value is acceptable" (wildcard)
        if value == '*' then
            -- Just check that the key exists (which we already confirmed above)
            -- and has some value (not empty)
            if object.tags[key] == '' then
                return false
            end
        else
            -- Exact match required
            if object.tags[key] ~= value then
                return false
            end
        end
    end
    return true  -- All tags matched
end

-- Function to find POI category from mapping
function find_poi_category(object)
    for _, category in ipairs(poi_mapping) do
        local mappings = category.matches or {}
        for _, mapping_tags in ipairs(mappings) do
            if matches_poi_criteria(object, mapping_tags) then
                return category
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
