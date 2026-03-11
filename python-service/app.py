import os
from typing import Any, Dict, Optional

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


def _json_error(message: str, status_code: int = 400, *, details: Optional[str] = None):
    payload: Dict[str, Any] = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status_code


def _safe_numeric_summary(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_df = df.select_dtypes(include="number")
    if numeric_df.shape[1] == 0:
        return {}
    # Use describe() on numeric columns only and convert to plain JSON-serializable dict
    return numeric_df.describe().to_dict()


def _top_categories_first_non_numeric(df: pd.DataFrame, top_n: int = 5) -> Dict[str, int]:
    non_numeric_cols = df.select_dtypes(exclude="number").columns.tolist()
    if not non_numeric_cols:
        return {}
    col = non_numeric_cols[0]
    # Convert to string to avoid JSON issues with mixed types
    vc = df[col].astype("string").value_counts(dropna=True).head(top_n)
    return {str(k): int(v) for k, v in vc.items()}


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/analyze")
    def analyze():
        try:
            if "file" not in request.files:
                return _json_error('No file uploaded. Use form-data field name "file".', 400)

            file = request.files["file"]
            if not file or file.filename is None or file.filename.strip() == "":
                return _json_error("Uploaded file is missing a filename.", 400)

            if not file.filename.lower().endswith(".csv"):
                return _json_error("Only CSV files are allowed.", 400)

            try:
                df = pd.read_csv(file)
            except Exception as e:  # noqa: BLE001 - return readable error
                return _json_error("Failed to read CSV.", 400, details=str(e))

            if df is None or df.shape[1] == 0:
                return _json_error("CSV appears to have no columns.", 400)

            missing_values = df.isna().sum().to_dict()
            missing_values = {str(k): int(v) for k, v in missing_values.items()}

            response = {
                "row_count": int(len(df)),
                "column_names": [str(c) for c in df.columns.tolist()],
                "numeric_summary": _safe_numeric_summary(df),
                "top_categories": _top_categories_first_non_numeric(df, top_n=5),
                "missing_values": missing_values,
            }
            return jsonify(response), 200

        except Exception as e:  # noqa: BLE001 - last-resort handler
            app.logger.exception("Unhandled error in /analyze")
            details = str(e) if os.environ.get("FLASK_ENV") == "development" else None
            return _json_error("Internal server error", 500, details=details)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7000"))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)

