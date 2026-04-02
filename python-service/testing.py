import sqlite3 
import pandas as pd

df = pd.read_csv('tracker.csv') # reading csv into pandas dataframe

conn = sqlite3.connect(':memory:') #connecting to temporar db, lives in RAM

df.to_sql('tracker', conn, if_exists='replace', index = False) #dataframe to sql table

result = pd.read_sql_query('SELECT * FROM tracker LIMIT 5', conn) #read sql query into pandas dataframe

print (result) # print dataframe