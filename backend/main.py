from fastapi import FastAPI

app = FastAPI(title="电力看经济平台 API", version="1.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to Power-to-Economy Insight Platform API"}

# Placeholder for M02 Analysis API
@app.post("/api/analysis")
def analyze_factors(data: dict):
    return {"message": "Not implemented yet"}

# Placeholder for M03 Prediction API
@app.post("/api/prediction")
def predict_economics(data: dict):
    return {"message": "Not implemented yet"}
