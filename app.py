import os
import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask, render_template, request, redirect, jsonify, session, url_for
from datetime import datetime

app = Flask(__name__)
app.secret_key = "super_secret_key_123"


# ---------------- MYSQL CONFIG ----------------
DB = {
    "host": "localhost",
    "user": "root",
    "password": "Saikiran9493@#",
    "database": "dreamxstore"
}

def get_db():
    """Connect MySQL"""
    return pymysql.connect(
        host=DB["host"],
        user=DB["user"],
        password=DB["password"],
        database=DB["database"],
        cursorclass=pymysql.cursors.Cursor
    )


# ---------------- FILE UPLOADS ----------------
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)



# ---------------- USER PAGES ----------------
@app.route('/')
def index():
    return render_template("index.html")

@app.route('/login-page')
def login_page():
    return render_template("login.html")

@app.route('/register-page')
def register_page():
    return render_template("register.html")

@app.route('/products')
def products():
    return render_template("products.html")

@app.route('/product-details')
def product_details():
    return render_template("product-details.html")



# ---------------- ADMIN PAGE PROTECTION ----------------
def admin_required():
    if "admin" not in session:
        return False
    return True



# ---------------- ADMIN PAGES ----------------
@app.route('/admin/dashboard')
def page_dashboard():
    if not admin_required():
        return redirect(url_for('login_page'))
    return render_template("admin-dashboard.html")

@app.route('/admin/brands')
def page_brands():
    if not admin_required():
        return redirect(url_for('login_page'))
    return render_template("admin-brands.html")

@app.route('/admin/images')
def page_images():
    if not admin_required():
        return redirect(url_for('login_page'))
    return render_template("admin-images.html")

@app.route('/admin/analytics')
def page_analytics():
    if not admin_required():
        return redirect(url_for('login_page'))
    return render_template("admin-analytics.html")



# ---------------- LOGIN SYSTEM ----------------
@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']


        # ---- ADMIN LOGIN ----
        if email == "admin@gmail.com" and password == "admin123":
            session['admin'] = True
            return redirect(url_for('page_dashboard'))


        # ---- USER LOGIN ----
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id FROM users WHERE email=%s AND password=%s", (email, password))
        user = cur.fetchone()

        if user:
            session['user_id'] = user[0]
            return redirect(url_for('index'))
        else:
            return "Invalid email or password"

    return render_template("login.html")



# ---------------- USER REGISTER ----------------
@app.route('/register', methods=['POST'])
def register():
    name = request.form['name']
    email = request.form['email']
    password = request.form['password']

    db = get_db()
    cur = db.cursor()

    cur.execute("INSERT INTO users(name, email, password) VALUES (%s, %s, %s)",
                (name, email, password))

    db.commit()
    db.close()

    return redirect(url_for('login_page'))



# ---------------- API: DASHBOARD ----------------
@app.route('/api/dashboard')
def api_dashboard():
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT COUNT(*) FROM users")
    users = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM brands")
    brands = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM orders")
    orders = cur.fetchone()[0]

    cur.execute("SELECT IFNULL(SUM(amount),0) FROM orders")
    revenue = float(cur.fetchone()[0])


    # Recent Orders
    cur.execute("""
        SELECT orders.id, users.name, orders.amount, orders.status
        FROM orders
        JOIN users ON users.id = orders.user_id
        ORDER BY orders.created_at DESC
        LIMIT 5
    """)
    recent_orders = [
        {"id": r[0], "user": r[1], "amount": float(r[2]), "status": r[3]}
        for r in cur.fetchall()
    ]


    # Recent Brands
    cur.execute("""
        SELECT brand_name, owner_email, status
        FROM brands
        ORDER BY created_at DESC
        LIMIT 5
    """)
    recent_brands = [
        {"name": r[0], "email": r[1], "status": r[2]}
        for r in cur.fetchall()
    ]

    db.close()

    return jsonify({
        "total_users": users,
        "total_brands": brands,
        "total_orders": orders,
        "total_revenue": revenue,
        "recent_orders": recent_orders,
        "recent_brands": recent_brands
    })



# ---------------- API: BRAND LIST ----------------
@app.route('/api/brands')
def api_brands():
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT * FROM brands ORDER BY id DESC")
    rows = cur.fetchall()

    db.close()

    return jsonify({
        "brands": [
            {
                "id": r[0],
                "name": r[1],
                "email": r[2],
                "status": r[3],
                "created_at": str(r[4])
            }
            for r in rows
        ]
    })



# ---------------- API: ANALYTICS ----------------
@app.route('/api/analytics')
def api_analytics():
    db = get_db()
    cur = db.cursor()

    cur.execute("""
        SELECT brands.brand_name, SUM(orders.amount)
        FROM orders
        JOIN brands ON orders.brand_id = brands.id
        GROUP BY brand_id
        ORDER BY SUM(amount) DESC
    """)
    top_brands = [
        {"name": r[0], "revenue": float(r[1])}
        for r in cur.fetchall()
    ]

    cur.execute("SELECT status, COUNT(*) FROM orders GROUP BY status")
    status_counts = [
        {"status": r[0], "count": r[1]}
        for r in cur.fetchall()
    ]

    db.close()

    return jsonify({
        "top_brands": top_brands,
        "order_status": status_counts,
        "monthly_growth": 20
    })



# ---------------- ADD BRAND ----------------
@app.route('/admin/add-brand', methods=['POST'])
def add_brand():
    name = request.form['brand_name']
    email = request.form['owner_email']

    db = get_db()
    cur = db.cursor()

    cur.execute("""
        INSERT INTO brands (brand_name, owner_email, status)
        VALUES (%s, %s, 'Active')
    """, (name, email))

    db.commit()
    db.close()

    return redirect(url_for('page_brands'))



# ---------------- IMAGE UPLOAD ----------------
@app.route('/admin/upload-product-images', methods=['POST'])
def upload_images():
    files = request.files.getlist("images")
    uploaded = []

    for f in files:
        if f.filename:
            filename = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + f.filename
            f.save(os.path.join(UPLOAD_FOLDER, filename))
            uploaded.append(filename)

    return jsonify({"uploaded": uploaded})



# ---------------- RUN ----------------
if __name__ == '__main__':
    app.run(debug=True)

