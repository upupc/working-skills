SELECT
  a1.emp_id,
  a1.full_emp_id,
  a1.last_name,
  a1.nick_name_cn,
  a1.dep_desc,
  substring_index(a2.account, '@', 1) AS account,
  a2.email,
  a2.gmt_create
FROM
  icbutech.icbu_buc_user a1
LEFT JOIN
  onetouch.s_t_basedata_buc_user_ot_basedata a2
ON a1.emp_id = a2.emp_id
AND a2.ds = MAX_PT('onetouch.s_t_basedata_buc_user_ot_basedata')
WHERE
  a1.hr_status = 'N'
  AND a1.emp_id IN (
'xxx'
  );
