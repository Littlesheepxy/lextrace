import sqlite3

def migrate():
    conn = sqlite3.connect('lextrace.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE versions ADD COLUMN html_content TEXT")
        print("Successfully added html_content column to versions table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column html_content already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
