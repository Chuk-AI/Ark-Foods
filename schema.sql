-- Create User Table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(256) NOT NULL,
    role VARCHAR(50) NOT NULL,
    approved BOOLEAN DEFAULT FALSE
);

-- Create PriceData Table
CREATE TABLE IF NOT EXISTS "price_data" (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    day INTEGER NOT NULL,
    price FLOAT NOT NULL,
    source VARCHAR(50) NOT NULL,
    season VARCHAR(20) NOT NULL
);
