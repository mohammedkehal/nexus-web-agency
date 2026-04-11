import sqlite3
import os

# Ajustez le nom si votre fichier s'appelle autrement
db_name = "agence_portfolio.db"

if not os.path.exists(db_name):
    print(f"❌ Impossible de trouver le fichier : {db_name}")
    print("Assurez-vous d'exécuter ce script depuis le dossier où se trouve la base.")
else:
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()

        # Demander à SQLite la liste de toutes les tables existantes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if not tables:
            print("📭 La base de données est vide (aucune table trouvée).")

        for table_name in tables:
            table = table_name[0]
            print(f"\n{'='*50}")
            print(f"📦 TABLE : {table.upper()}")
            print(f"{'='*50}")

            # Récupérer tout le contenu de la table
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()

            # Récupérer et afficher le nom des colonnes
            column_names = [description[0] for description in cursor.description]
            print(" | ".join(column_names))
            print("-" * 50)

            if not rows:
                print("   (Table vide)")
            else:
                for row in rows:
                    print(row)

        conn.close()
        print("\n✅ Audit de la base de données terminé.")

    except Exception as e:
        print(f"❌ Erreur lors de la lecture de la base : {e}")