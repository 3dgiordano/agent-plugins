-- up
CREATE TABLE schema_version (version INTEGER NOT NULL);

-- down
DROP TABLE schema_version;
