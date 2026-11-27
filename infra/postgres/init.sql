-- Roda só na primeira vez que o volume é criado.

-- Banco separado para os testes automatizados (é apagado e recriado à vontade).
CREATE DATABASE notamotors_test OWNER notamotors;

-- Usuário da API: não é dono das tabelas, então o RLS sempre se aplica a ele.
-- Os privilégios (GRANT) e as políticas vêm das migrações. Senha só para uso local.
CREATE ROLE notamotors_app LOGIN PASSWORD 'notamotors_app';
