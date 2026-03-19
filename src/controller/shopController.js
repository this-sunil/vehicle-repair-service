const createShopTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS shop(
  sid SERIAL PRIMARY KEY,
  shopName VARCHAR(255) NOT NULL,
  shopPhoto VARCHAR(255) NOT NULL,
  shopTime VARCHAR(255) NOT NULL,
  phone BIGINT NOT NULL,
  lat FLOAT NOT NULL,
  long FLOAT NOT NULL,
  status BOOLEAN NOT NULL,
  city VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
};
