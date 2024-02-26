require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const mysql = require('mysql2')
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE
})
//p2
const conn2 = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE2
})
const xl = require('excel4node');
//p2/
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secect = 'abcdefg'
const multer = require("multer");


const fs = require('fs')
const walk = require('walk');

app.use(cors());
app.use(express.json());
//app.use(jsonParser);

app.use(express.static("public"));
app.use("/images", express.static("images"))


// users
app.post('/useradd', jsonParser, (req, res, next) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        var Isql = "INSERT INTO users (us_email, us_password, us_name, us_agency, us_level) VALUES (?, ?, ?, ?, 0)"
        var IV = [req.body.email, hash, req.body.name, req.body.agency]
        conn.execute(Isql, IV, (err, results, fields) => {
            if (err) {
                res.json({ status: 'error', massage: err })
                return
            } else
                res.json({ status: 'ok' })

        })

    });

})

app.put('/useredit', jsonParser, (req, res, next) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        var Isql = "UPDATE users SET us_password = ?, us_name = ? WHERE us_agency = ?;"
        var IV = [hash, req.body.name, req.body.agency]
        conn.execute(Isql, IV, (err, results, fields) => {
            if (err) {
                res.json({ status: 'error', massage: err })
                return
            } else
                res.json({ status: 'ok' })

        })

    });

})


app.post('/login', jsonParser, (req, res, next) => {
    var qsql = "SELECT * FROM users WHERE us_name = ?"
    var qy = req.body.name
    conn.execute(qsql, [qy], (err, users, fields) => {
        if (err) { res.json({ status: 'error', massage: err }); return }
        if (users.length === 0) { res.json({ status: 'error', massage: 'no user not found' }); return }
        bcrypt.compare(req.body.password, users[0].us_password, (err, islogin) => {
            if (islogin) {
                var token = jwt.sign({ name: users[0].us_name }, secect, { expiresIn: '1h' }) + "$" + users[0].us_level;
                res.json({ status: 'ok', massage: 'login success', token, name: users[0].us_name, id: users[0].us_id, agency: users[0].us_agency });
            } else {
                res.json({ status: 'erorr', massage: 'login failed' })
            }
        })
    })
})

app.post('/authen', jsonParser, (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, secect);
        res.json({ status: 'ok', name: decoded.name, decoded });
    } catch (err) {
        res.json({ status: 'error', massage: err.message })
    }

});

app.get('/users', (req, res) => {
    conn.query("SELECT * FROM users ", (err, results, fields) => {
        res.send(results)
    })
});

app.get('/users/:id', (req, res) => {
    const id = req.params.id
    conn.query("SELECT * FROM users WHERE us_id = ?", [id], (err, results, fields) => {
        res.send(results)
    })
});

// form
app.post('/form/add', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO form (fm_id, fm_name, fm_solve, fm_method, fm_define, fm_paras, fm_com, fm_con, fm_numpara, fm_res) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.id, req.body.name, req.body.solve, req.body.method, req.body.def, req.body.paras, req.body.com, req.body.con, req.body.numpara, req.body.res]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })

    })

})

app.get("/form", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM form ORDER BY ABS(fm_id) ASC", (err, form, fields) => {
        res.send(form);
    })
})

app.get("/form/undefined", jsonParser, (req, res, next) => {

})

app.get("/form/res/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query(`SELECT fm_id FROM form WHERE fm_res LIKE '%${id}%' ORDER BY ABS(fm_id);`, (err, resp, fields) => {
        res.send(resp);
    })
})

app.get("/form/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query(`SELECT * FROM form WHERE fm_id = ${id}`, (err, form, fields) => {
        res.send(form);
    })
})

app.put("/update/form", jsonParser, (req, res, next) => {
    var sql = "UPDATE form SET fm_name = ?, fm_solve= ?, fm_define = ? WHERE fm_id = ?"
    const up = [req.body.name, req.body.solve, req.body.def, req.body.id]
    conn.execute(sql, up, (err, upd, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/update/form/res", jsonParser, (req, res, next) => {
    var sql = "UPDATE form SET fm_res = ? WHERE fm_id = ?"
    const up = [req.body.res, req.body.id]
    conn.execute(sql, up, (err, upd, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

//detail
app.post('/form/fill', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO detail ( fm_id, de_qur, de_paras, de_ans, de_result ) VALUES (?, ?, ?, ?, ?)"
    var IV = [req.body.formid, req.body.qur, req.body.paras, req.body.ans, req.body.result]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.get("/detail", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM detail", (err, detail, fields) => {
        res.send(detail);
    })
})


app.get("/detail/:id", jsonParser, (req, res, next) => {
    const id = req.params.id;
    conn.query("SELECT * FROM detail WHERE de_id = ?", [id], (err, detail, fields) => {
        res.send(detail);
    })
})

app.put("/update/detail", jsonParser, (req, res, next) => {
    var sql = "UPDATE detail SET de_paras = ?, de_ans= ?, de_result = ? WHERE de_id = ?"
    const up = [req.body.paras, req.body.ans, req.body.result, req.body.deid]
    conn.execute(sql, up, (err, upd, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.post("/detail/delete/:id/:hn/:fd", jsonParser, (req, res, next) => {
    var id = req.params.id;
    const fd = req.params.fd
    const hn = req.params.hn
    var sql = `UPDATE result SET ${hn} = ?, ${hn}pa = ?, ${hn}pb = ?, pa1 = ?, pa2 = ?, re_log = ?, re_sum = ? WHERE fm_id = ${fd}`
    const up = [req.body.h, req.body.hpa1, req.body.hpa2, req.body.pa1, req.body.pa2, req.body.log, req.body.sum]

    conn.execute(sql, up, (err, upd, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else {
            conn.execute("DELETE FROM formed WHERE de_id = ?", [id], (err, del, filelds) => {
                if (err) {
                    res.json({ status: 'error', massage: err })
                    return
                } else {
                    conn.execute("DELETE FROM detail WHERE de_id = ?", [id], (err, del, filelds) => {
                        if (err) {
                            res.json({ status: 'error', massage: err })
                            return
                        } else {
                            res.json({ status: 'ok' })
                        }
                    })
                }
            })
        }

    })

    
})

//eved
app.post('/eved/fill', jsonParser, (req, res, next) => {
    const date = `${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}-${new Date().getUTCDate()}`
    const time = `${new Date().getUTCHours() + 7}:${new Date().getUTCMinutes()}:${new Date().getUTCSeconds()}`
    var Isql = "INSERT INTO eved (ev_id, us_id, ed_date, ed_time, ed_update) VALUES (?, ?, ?, ?, ?)"
    var IV = [req.body.event, req.body.user, date, time, date]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/eved/update", jsonParser, (req, res, next) => {
    const date = `${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}-${new Date().getUTCDate()}`
    const time = `${new Date().getUTCHours() + 7}:${new Date().getUTCMinutes()}:${new Date().getUTCSeconds()}`
    var Usql = "UPDATE eved SET ed_update = ?, us_id = ?, ed_time = ? WHERE ev_id = ?"
    var vl = [date, req.body.user, time, req.body.event]
    conn.execute(Usql, vl, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok', v: time, d: date })
    })
})

app.get("/eved", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM eved", (err, formed, fields) => {
        formed = formed.map(d => {
            d.ed_date = d.ed_date.toISOString().split('T')[0];
            if (d.ed_update != null)
                d.ed_update = d.ed_update.toISOString().split('T')[0];
            return d;
        })
        res.send(formed)
    })
})

app.get("/eved/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM eved WHERE ev_id = ?", [id], (err, formed, fields) => {
        res.send(formed)
    })
})

//formed
app.post('/formed/fill', jsonParser, (req, res, next) => {
    const date = `${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}-${new Date().getUTCDate()}`
    const time = `${new Date().getUTCHours() + 7}:${new Date().getUTCMinutes()}:${new Date().getUTCSeconds()}`
    var Isql = "INSERT INTO formed (us_id, de_id, fd_date, fd_time) VALUES (?, ?, ?, ?)"
    var IV = [req.body.user, req.body.detail, date, time]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/formed/update", jsonParser, (req, res, next) => {
    const date = `${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}-${new Date().getUTCDate()}`
    const time = `${new Date().getUTCHours() + 7}:${new Date().getUTCMinutes()}:${new Date().getUTCSeconds()}`
    var Usql = "UPDATE formed SET fd_update = ?, us_id = ?, fd_time = ? WHERE de_id = ?"
    var vl = [date, req.body.user, time, req.body.detail]
    conn.execute(Usql, vl, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok', v: time, d: date })
    })
})

app.get("/formed", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM formed", (err, formed, fields) => {
        formed = formed.map(d => {
            d.fd_date = d.fd_date.toISOString().split('T')[0];
            if (d.fd_update != null)
                d.fd_update = d.fd_update.toISOString().split('T')[0];
            return d;
        })
        res.send(formed)
    })
})

app.get("/formed/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM formed WHERE fd_id = ?", [id], (err, formed, fields) => {
        res.send(formed)
    })
})

//event
app.get("/event", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM event", (err, ev, fields) => {
        res.send(ev)
    })
})

app.get("/event/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM event WHERE ev_id = ?;", [id], (err, evid, fields) => {
        res.send(evid)
    })
})

app.get("/event/fm/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM event WHERE fm_id = ?;", [id], (err, evid, fields) => {
        res.send(evid)
    })
})

app.post("/ev/add", jsonParser, (req, res, next) => {
    const sql = "INSERT INTO event (fm_id, ev_qur, fms_id, ev_name, ev_res, ev_status, ev_budget, ev_buded, ev_point, ev_target, ev_result , ev_problem, ev_str, ev_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    //const val = [req.body.deid, req.body.fmsid, req.body.evname, req.body.evres, req.body.evstatus, req.body.evbudget, req.body.evbuded, req.body.evpoint, req.body.evtarget, req.body.result, req.body.problem, req.body.str, "{}"];
    const val = [req.body.fmid, req.body.qur, req.body.fmsid, req.body.evname, req.body.evres, req.body.evstatus, req.body.evbudget, req.body.evbuded, req.body.evpoint, req.body.evtarget, req.body.result, req.body.problem, req.body.str, req.body.evimg];
    conn.execute(sql, val, (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            return;
        } else {
            res.json({ status: "ok" })
        }
    })
})

app.put("/ev/edit", jsonParser, (req, res, next) => {
    const sql = "UPDATE event SET fms_id = ?, ev_qur = ?, ev_name = ?, ev_res = ?, ev_status = ?, ev_budget = ?, ev_buded = ?, ev_point = ?, ev_target = ?, ev_result = ?, ev_problem = ?, ev_str = ?, ev_img = ? WHERE ev_id = ?";
    //const val = [req.body.fmsid, req.body.evname, req.body.evres, req.body.evstatus, req.body.evbudget, req.body.evbuded, req.body.evpoint, req.body.evtarget, req.body.result, req.body.problem, req.body.str, "{}", req.body.deid];
    const val = [req.body.fmsid, req.body.qur, req.body.evname, req.body.evres, req.body.evstatus, req.body.evbudget, req.body.evbuded, req.body.evpoint, req.body.evtarget, req.body.result, req.body.problem, req.body.str, req.body.evimg, req.body.evid];
    conn.execute(sql, val, (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            return;
        } else {
            res.json({ status: "ok" })
        }
    })
})

app.put("/ev/edit/img", jsonParser, (req, res, next) => {
    const sql = "UPDATE event SET ev_img = ? WHERE ev_id = ?";
    const val = [req.body.evimg, req.body.evid];
    conn.execute(sql, val, (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            return;
        } else {
            res.json({ status: "ok" })
        }
    })
})

app.delete("/event/delete/:id", jsonParser, (req, res, next) => {
    var id = req.params.id;
    conn.execute("DELETE FROM eved WHERE ev_id = ?", [id], (err, del, filelds) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else {
            conn.execute("DELETE FROM event WHERE ev_id = ?", [id], (err, del, filelds) => {
                if (err) {
                    res.json({ status: 'error', massage: err })
                    return
                } else {
                    res.json({ status: 'ok' })
                }
            })
        }
    })
})

//result
app.get("/result", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM result", (err, resu, fields) => {
        res.send(resu);
    })
})

app.get("/result/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM result WHERE fm_id = ?", [id], (err, resu, fields) => {
        res.send(resu);
    })
})

app.post("/result/add", jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO result (fm_id) VALUES (?)"
    var IV = [req.body.fmid]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/result/update/:hn/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    const hn = req.params.hn
    var sql = `UPDATE result SET ${hn} = ?, ${hn}pa = ?, ${hn}pb = ?, pa1 = ?, pa2 = ?, re_log = ?, re_sum = ? WHERE fm_id = ${id}`
    const up = [req.body.h, req.body.hpa1, req.body.hpa2, req.body.pa1, req.body.pa2, req.body.log, req.body.sum]
    conn.execute(sql, up, (err, upd, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})


//all
app.get("/all", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM detail RIGHT JOIN formed ON detail.de_id = formed.de_id RIGHT JOIN users ON formed.us_id = users.us_id RIGHT JOIN form on form.fm_id = detail.fm_id ORDER BY users.us_id ASC;",
        (err, all, fields) => {
            all = all.map(d => {
                if (d.fd_date != null)
                    d.fd_date = d.fd_date.toISOString().split('T')[0];
                if (d.fd_update != null)
                    d.fd_update = d.fd_update.toISOString().split('T')[0];
                return d;
            })
            res.send(all);
        })
})

app.get("/all/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM detail RIGHT JOIN formed ON detail.de_id = formed.de_id RIGHT JOIN users ON formed.us_id = users.us_id RIGHT JOIN form on form.fm_id = detail.fm_id WHERE detail.fm_id = ? ORDER BY users.us_id ASC",
        [id], (err, all, fields) => {
            all = all.map(d => {
                if (d.fd_date != null)
                    d.fd_date = d.fd_date.toISOString().split('T')[0];
                if (d.fd_update != null)
                    d.fd_update = d.fd_update.toISOString().split('T')[0];
                return d;
            })
            res.send(all);
        })
})

app.get("/all/hp/:user/:id", jsonParser, (req, res, next) => {
    const user = req.params.user
    const id = req.params.id
    conn.query("SELECT * FROM detail RIGHT JOIN formed ON detail.de_id = formed.de_id RIGHT JOIN users ON formed.us_id = users.us_id RIGHT JOIN form on form.fm_id = detail.fm_id WHERE users.us_id = ? AND detail.fm_id = ?",
        [user, id], (err, all, fields) => {
            all = all.map(d => {
                if (d.fd_date != null)
                    d.fd_date = d.fd_date.toISOString().split('T')[0];
                if (d.fd_update != null)
                    d.fd_update = d.fd_update.toISOString().split('T')[0];
                return d;
            })
            res.send(all);
        })
})

//report
app.get('/report/api', (req, res) => {

    const page = parseInt(req.query.page);
    const per_page = parseInt(req.query.per_page);
    const sort_collumn = req.query.sort_collumn;
    const sort_direction = req.query.sort_direction;
    const quarter = req.query.quarter;
    const search = req.query.search;

    const start_idx = (page - 1) * per_page;
    var params = [];
    var sql = "SELECT * FROM detail RIGHT JOIN formed ON detail.de_id = formed.de_id RIGHT JOIN users ON formed.us_id = users.us_id RIGHT JOIN form on form.fm_id = detail.fm_id";
    if (quarter) {
        sql += " WHERE de_qur = ?"
        params.push(quarter);
    }
    if (search) {
        sql += " WHERE us_agency LIKE ? "
        params.push("%" + search + "%");
    }
    if (sort_collumn) {
        sql += " ORDER BY " + sort_collumn + " " + sort_direction;
    }
    sql += " LIMIT ?, ? ";
    params.push(start_idx);
    params.push(per_page);

    console.log(sql, params);
    conn.execute(sql, params, (err, tables, fields) => {
        tables = tables.map(d => {
            if (d.fd_date != null)
                d.fd_date = d.fd_date.toISOString().split('T')[0];
            return d;
        })
        console.log(tables)
        res.json(tables)
    })
});

//detail+form 
app.get("/checked", jsonParser, (req, res, next) => {
    const sql = "SELECT formed.us_id, detail.fm_id FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id"
    conn.query(sql, (req, results, fields) => {
        res.send(results)
    })
})

app.get("/checked/:qu", jsonParser, (req, res, next) => {
    var qu = req.params.qu
    const sql = "SELECT formed.us_id, detail.fm_id, form.fm_res, detail.de_id FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id RIGHT JOIN form ON detail.fm_id = form.fm_id WHERE detail.de_qur = ? ORDER BY us_id, fm_id"
    conn.query(sql, [qu], (req, results, fields) => {
        res.send(results)
    })
})

app.get("/checked/:qu/:us", jsonParser, (req, res, next) => {
    var qu = req.params.qu
    var us = req.params.us
    const sql = "SELECT formed.us_id, detail.fm_id, form.fm_res, detail.de_id FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id RIGHT JOIN form ON detail.fm_id = form.fm_id WHERE detail.de_qur = ? AND formed.us_id = ? ORDER BY ABS(form.fm_id) ASC;"
    conn.query(sql, [qu, us], (req, results, fields) => {
        res.send(results)
    })
})


app.get("/checked/detail/:de", jsonParser, (req, res, next) => {
    var de = req.params.de
    const sql = "SELECT * FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id WHERE detail.de_qur = ? ORDER BY formed.us_id ASC"
    conn.query(sql, [de], (req, results, fields) => {
        res.send(results)
    })
})

app.get("/checked/user/:us/:fm", jsonParser, (req, res, next) => {
    var us = req.params.us
    var fm = req.params.fm
    const sql = "SELECT de_qur FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id WHERE formed.us_id = ? AND detail.fm_id =? ORDER BY formed.us_id ASC"
    conn.query(sql, [us, fm], (req, results, fields) => {
        res.send(results)
    })
})

app.get("/checked/id/:fm/:de", jsonParser, (req, res, next) => {
    var fm = req.params.fm
    var de = req.params.de
    const sql = "SELECT * FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id WHERE detail.fm_id = ? AND detail.de_qur = ? ORDER BY formed.us_id ASC"
    conn.query(sql, [fm, de], (req, results, fields) => {
        res.send(results)
    })
})

app.get("/checked/s/:qu/c", jsonParser, (req, res, next) => {
    var qu = req.params.qu
    const sql = "SELECT detail.fm_id FROM formed RIGHT JOIN detail ON formed.de_id = detail.de_id RIGHT JOIN form ON detail.fm_id = form.fm_id WHERE detail.de_qur = ? GROUP BY fm_id ORDER BY ABS(form.fm_id)"
    conn.query(sql, [qu], (req, results, fields) => {
        res.send(results)
    })
})

//re+fm

app.get("/ans", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM result RIGHT JOIN form ON result.fm_id = form.fm_id WHERE result.re_id IS NOT NULL ORDER BY ABS(result.fm_id) ASC;", (err, ans, fields) => {
        res.send(ans)
    })
})

//ev+de
app.get("/evde", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM event RIGHT JOIN eved ON event.ev_id = eved.ev_id WHERE event.ev_id IS NOT NULL ORDER BY eved.ev_id ASC;", (err, even, fields) => {
        res.send(even)
    })
})

app.get('/evde/:id', (req, res) => {
    const id = req.params.id
    conn.query("SELECT * FROM event RIGHT JOIN eved ON event.ev_id = eved.ev_id WHERE event.ev_id = ? ORDER BY eved.ed_id ASC;", [id], (err, evid, fields) => {
        res.send(evid)
    })
});

app.get('/evde/user/:us', (req, res) => {
    const us = req.params.us
    conn.query("SELECT * FROM event RIGHT JOIN eved ON event.ev_id = eved.ev_id WHERE eved.us_id = ? ORDER BY eved.ed_id ASC;", [us], (err, evid, fields) => {
        res.send(evid)
    })
});

app.get('/evde/:form/:id', (req, res) => {
    const id = req.params.id
    const form = req.params.form
    conn.query("SELECT * FROM event RIGHT JOIN eved ON event.ev_id = eved.ev_id WHERE event.fm_id = ? AND eved.us_id = ? ORDER BY event.ev_qur DESC;", [form, id], (err, evifd, fields) => {
        res.send(evifd)
    })
});

app.get('/evde/f/:id/a', (req, res) => {
    const id = req.params.id
    conn.query("SELECT * FROM event RIGHT JOIN eved ON event.ev_id = eved.ev_id WHERE event.fm_id = ? ORDER BY eved.us_id ASC;", [id], (err, evid, fields) => {
        res.send(evid)
    })
});

//uploads


const storage = multer.diskStorage({
    destination: function (req, file, cd) {
        return cd(null, "./images")
    },
    filename: function (req, file, cd) {
        return cd(null, `${new Date().getMilliseconds()}_${(file.originalname).split(".")[0]}.${(file.originalname).split(".")[1]}`)
    }
})

const upload = multer({ storage })

app.post("/upload", upload.single("file"), (req, res) => {
    res.json({ filename: req.file.filename })
})

//overviweimg
app.get("/files", (req, res) => {

    var files = [];

    var walker = walk.walk('./images', { followLinks: false });

    walker.on('file', function (root, stat, next) {
        files.push(stat.name);
        next();
    });

    walker.on('end', function () {
        res.send(files);
    });
})

//Home
app.get("/", (req, res) => {
    res.send("API")
})

//remove file
app.post("/rm/image/:name", jsonParser, (req, res, next) => {
    const name = req.params.name
    const path = "./images/" + name
    fs.unlink(path, (err) => {
        res.json({ status: "OK" })
        if (err) {
            console.error(err)
            return
        }
    })
})


//p2
app.get("/users2", jsonParser, (req, res) => {
    conn2.query("SELECT * FROM users", (err, t1) => {
        res.send(t1)
    })
})

app.post('/login2', jsonParser, (req, res, next) => {
    var qsql = "SELECT * FROM users WHERE us_name = ?"
    var qy = req.body.name
    conn2.execute(qsql, [qy], (err, users, fields) => {
        if (err) { res.json({ status: 'error', massage: err }); return }
        if (users.length === 0) { res.json({ status: 'error', massage: 'no user not found' }); return }
        bcrypt.compare(req.body.password, users[0].us_password, (err, islogin) => {
            if (islogin) {
                var token = jwt.sign({ name: users[0].us_name }, secect, { expiresIn: '1h' }) + "$" + users[0].us_level;
                res.json({ status: 'ok', massage: 'login success', token, name: users[0].us_name, id: users[0].us_id, dep: users[0].us_dep });
            } else {
                res.json({ status: 'erorr', massage: 'login failed' })
            }
        })
    })
})

app.put('/useredit2', jsonParser, (req, res, next) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        var Isql = "UPDATE users SET us_password = ?, us_name = ? WHERE us_id = ?;"
        var IV = [hash, req.body.name, req.body.id]
        conn2.execute(Isql, IV, (err, results, fields) => {
            if (err) {
                res.json({ status: 'error', massage: err })
                return
            } else
                res.json({ status: 'ok' })

        })

    });

})

app.post('/authen2', jsonParser, (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, secect);
        res.json({ status: 'ok', name: decoded.name, decoded });
    } catch (err) {
        res.json({ status: 'error', massage: err.message })
    }

});

app.get("/hospital2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM hospital", (err, t1) => {
        res.send(t1)
    })
})

app.get("/preflix2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM preflix", (err, t1) => {
        res.send(t1)
    })
})

app.get("/district2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM district", (err, t1) => {
        res.send(t1)
    })
})

app.post('/fill2', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `form` (`hos_id`, `date`, `citizen`, `pre_id`, `fname`, `lname`, `age`, `house`, `street`, `dis_id`, `subdis`, `zipcode`, `call`, `dateres`, `met_id`, `start`, `end`, `condition`, `editer` ,`fm_time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.hos, req.body.date, req.body.sitizen, req.body.preflix, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.district, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.met, req.body.start, req.body.end, req.body.condition, req.body.editer ,req.body.time]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.get("/form2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM formcom ORDER BY status ASC, dateres ASC", (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2/users/:us", jsonParser, (req, res, next) => {
    const us = req.params.us
    conn2.query("SELECT * FROM formcom WHERE hos_id = ? ORDER BY status ASC, dateres ASC", [us], (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn2.query("SELECT * FROM formcom WHERE formcom.fm_id = ?", [id], (err, t1) => {
        res.send(t1)
    })
})

app.post('/status2', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `carsmanage` (`us_id`, `fm_id`, `cm_status`, `cm_date`, `des`) VALUES (?, ?, ?, ?, ?)"
    var IV = [req.body.us_id, req.body.fm_id, req.body.cm_status, req.body.cm_date, req.body.des]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/statu2/edit/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    const d = new Date()
    var t = d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
    const sql = "UPDATE `carsmanage` SET `cm_status` = '0', `cm_date` = ?, `des` = '?' WHERE `carsmanage`.`cm_id` = ?";
    conn2.execute(sql, [t, req.body.des, id], (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            return;
        } else {
            res.json({ status: "ok" })
        }
    })
})



app.get("/excal2/:id", (req, res) => {
    var id = req.params.id
    var sql = "SELECT * FROM formcom WHERE hos_id = ? ORDER BY fm_id ASC"
    if (id === "14")
    sql = "SELECT * FROM formcom ORDER BY fm_id ASC"
    conn2.query(sql, [id], (err, t1) => {

        var wb = new xl.Workbook();
        var ws = wb.addWorksheet('Sheet 1');

        ws.cell(1, 1).string("ลำดับที่");
        ws.cell(1, 2).string("โรงพยาบาล");
        ws.cell(1, 3).string("วันที่จอง");
        ws.cell(1, 4).string("เวลาที่จอง");
        ws.cell(1, 5).string("เลขบัตรประชาชน");
        ws.cell(1, 6).string("คำนำหน้าชื่อ");
        ws.cell(1, 7).string("ชื่อ");
        ws.cell(1, 8).string("นามสกุล");
        ws.cell(1, 9).string("อายุ(ปี)");
        ws.cell(1, 10).string("บ้านเลขที่");
        ws.cell(1, 11).string("ถนน");
        ws.cell(1, 12).string("แขวง");
        ws.cell(1, 13).string("เขต");
        ws.cell(1, 14).string("รหัสไปรษณี");
        ws.cell(1, 15).string("เบอร์โทรศัพท์");
        ws.cell(1, 16).string("วันที่ขอรถ");
        ws.cell(1, 17).string("เวลาที่ขอรถ");
        ws.cell(1, 18).string("วิธีการ");
        ws.cell(1, 19).string("สถานที่ต้นทาง");
        ws.cell(1, 20).string("เลขที่ต้นทาง");
        ws.cell(1, 21).string("ถนนต้นทาง");
        ws.cell(1, 22).string("แขวงต้นทาง");
        ws.cell(1, 23).string("เขตต้นทาง");
        ws.cell(1, 24).string("รหัสไปรษณีต้นทาง");
        ws.cell(1, 25).string("สถานที่ปลายทาง");
        ws.cell(1, 26).string("เลขที่ปลายทาง");
        ws.cell(1, 27).string("ถนนปลายทาง");
        ws.cell(1, 28).string("แขวงปลายทาง");
        ws.cell(1, 29).string("เขตปลายทาง");
        ws.cell(1, 30).string("รหัสไปรษณีปลายทาง");
        ws.cell(1, 31).string("ผู้สูงอายุ");
        ws.cell(1, 32).string("ADL 5-12");
        ws.cell(1, 33).string("มีปัญหาด้านการเคลื่อนไหว");
        ws.cell(1, 34).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
        ws.cell(1, 35).string("มีปัญหาด้านเศรษฐานะ");
        ws.cell(1, 36).string("อื่น ๆ ระบุ");
        ws.cell(1, 37).string("คนพิการ");
        ws.cell(1, 38).string("การเห็น");
        ws.cell(1, 39).string("การได้ยินหรือสื่อความหมาย");
        ws.cell(1, 40).string("การเคลื่อนไหวหรือทางร่างกาย");
        ws.cell(1, 41).string("จิตใจหรือพฤติกรรม");
        ws.cell(1, 42).string("สติปัญญา");
        ws.cell(1, 43).string("การเรียนรู้");
        ws.cell(1, 44).string("ออทิสติก");
        ws.cell(1, 45).string("ชื่อผู้บันทึก");
        ws.cell(1, 46).string("สถานะ");
        ws.cell(1, 47).string("วันส่งข้อมูล");
        ws.cell(1, 48).string("เวลาส่งข้อมูล");
        ws.cell(1, 49).string("หมายเหตุ");

        t1.map((t, i) => {

            var start
            var end
            var condition
            var time
            var date

            if (t.start.split(" "))
            start = t.start.split(" ")
            else
            start = t.start

            if (t.end.split(" "))
            end = t.end.split(" ")
            else
            end = t.end

            if (t.condition.split(", "))
            condition = t.condition.split(", ")
            else
            condition = t.condition

            if (t.fm_time === null) {
                date = null
                time = null
            }
            else {
                date = `${t.fm_time.getDate()}/${t.fm_time.getMonth()+1}/${t.fm_time.getFullYear()}`
                time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
            }
            
            ws.cell(i + 2, 1).number(t.fm_id);
            ws.cell(i + 2, 2).string(t.hos_name);
            ws.cell(i + 2, 3).string(`${t.date.getDate()}/${t.date.getMonth()+1}/${t.date.getFullYear()}`);
            ws.cell(i + 2, 4).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
            ws.cell(i + 2, 5).string(t.citizen);
            ws.cell(i + 2, 6).string(t.pre_name);
            ws.cell(i + 2, 7).string(t.fname);
            ws.cell(i + 2, 8).string(t.lname);
            ws.cell(i + 2, 9).number(t.age);
            ws.cell(i + 2, 10).string(t.house);
            ws.cell(i + 2, 11).string(t.street);
            ws.cell(i + 2, 12).string(t.subdis);
            ws.cell(i + 2, 13).string(String(t.dis_name));
            ws.cell(i + 2, 14).string(t.zipcode);
            ws.cell(i + 2, 15).string(t.call);
            ws.cell(i + 2, 16).string(`${t.dateres.getDate()}/${t.dateres.getMonth()+1}/${t.dateres.getFullYear()}`);
            ws.cell(i + 2, 17).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
            ws.cell(i + 2, 18).string(t.met_name);
            ws.cell(i + 2, 19).string(start[0]);
            ws.cell(i + 2, 20).string(start[1]);
            ws.cell(i + 2, 21).string(start[2]);
            ws.cell(i + 2, 22).string(start[3]);
            ws.cell(i + 2, 23).string(start[4]);
            ws.cell(i + 2, 24).string(start[6]);
            ws.cell(i + 2, 25).string(end[0]);
            ws.cell(i + 2, 26).string(end[1]);
            ws.cell(i + 2, 27).string(end[2]);
            ws.cell(i + 2, 28).string(end[3]);
            ws.cell(i + 2, 29).string(end[4]);
            ws.cell(i + 2, 30).string(end[7]);
            ws.cell(i + 2, 31).string(condition[0]);
            ws.cell(i + 2, 32).string(condition[1]);
            ws.cell(i + 2, 33).string(condition[2]);
            ws.cell(i + 2, 34).string(condition[3]);
            ws.cell(i + 2, 35).string(condition[4]);
            ws.cell(i + 2, 36).string(condition[5]);
            ws.cell(i + 2, 37).string(condition[6]);
            ws.cell(i + 2, 38).string(condition[7]);
            ws.cell(i + 2, 39).string(condition[8]);
            ws.cell(i + 2, 40).string(condition[9]);
            ws.cell(i + 2, 41).string(condition[10]);
            ws.cell(i + 2, 42).string(condition[11]);
            ws.cell(i + 2, 43).string(condition[12]);
            ws.cell(i + 2, 44).string(condition[13]);
            ws.cell(i + 2, 45).string(t.editer);
            ws.cell(i + 2, 46).string(String(t.status));
            ws.cell(i + 2, 47).string(date);
            ws.cell(i + 2, 48).string(time);
            ws.cell(i + 2, 49).string(t.des);
        
        })

        wb.write('ExcelFile.xlsx', res);
    })

})

const Port = process.env.PORT || 5000
app.listen(Port, jsonParser, () => {
    console.log(`start server on Port ${Port}`)
})
