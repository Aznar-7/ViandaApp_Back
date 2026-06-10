const fs = require("fs");
const path = require("path");

module.exports = async () => {
    const base = path.resolve("data/test.sqlite");
    for (const suffix of ["", "-shm", "-wal"]) {
        fs.rmSync(`${base}${suffix}`, { force: true });
    }
};
