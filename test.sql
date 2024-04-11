WITH maxInfo AS (
  SELECT 
    customerCode, 
    MAX(fileName) AS maxFileName 
  FROM 
    [dbo].[star-small-sales] 
  WHERE 
    fileName NOT LIKE '%undefined%' 
    AND isDeleted = 0 
  GROUP BY 
    customerCode
), 
newMaxInfo AS (
  SELECT 
    customerCode, 
    MAX(fileName) AS maxFileName 
  FROM 
    [dbo].[star-small-sales-distributor] 
  WHERE 
    fileName NOT LIKE '%undefined%' 
    AND isDeleted = 0 
  GROUP BY 
    customerCode
) 
SELECT 
  sales.fileName, 
  CONVERT(
    VARCHAR(10), 
    sales.saleDate, 
    111
  ) AS saleDate, 
  sales.saleName, 
  sales.saleCode, 
  sales.purchaseName, 
  sales.purchaseCode, 
  sales.productName, 
  sales.productCode, 
  sales.saleAmount, 
  sales.price, sales.deliveryAddress,
  sales.batchNumber, 
  CONVERT(
    VARCHAR(10), 
    sales.expiredDate, 
    111
  ) AS expiredDate 
FROM 
  [dbo].[star-small-sales] AS sales 
  INNER JOIN maxInfo ON sales.customerCode = maxInfo.customerCode 
  and sales.fileName = maxInfo.maxFileName 
WHERE 
  sales.fileName NOT LIKE '% %' 
UNION 
SELECT 
  newSales.fileName, 
  CONVERT(
    VARCHAR(10), 
    newSales.saleDate, 
    111
  ) AS saleDate, 
  newSales.saleName, 
  newSales.saleCode, 
  newSales.purchaseName, 
  newSales.purchaseCode, 
  newSales.productName, 
  newSales.productCode, 
  newSales.saleAmount, 
  newSales.price, newSales.deliveryAddress,
  newSales.batchNumber, 
  CONVERT(
    VARCHAR(10), 
    newSales.expiredDate, 
    111
  ) AS expiredDate 
FROM 
  [dbo].[star-small-sales-distributor] AS newSales 
  INNER JOIN newMaxInfo ON newSales.customerCode = newMaxInfo.customerCode 
  AND newSales.fileName = newMaxInfo.maxFileName
WHERE 
  newSales.fileName NOT LIKE '% %'