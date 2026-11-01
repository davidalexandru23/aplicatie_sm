# Pachet șabloane SSM cu placeholder-e

Conține 25 de șabloane normalizate, pregătite pentru integrare în aplicația internă:

- 23 documente Word (`.docx`) incluzând formularele de cerere și declarații
- 2 registre Excel (`.xlsx`)
- (versiunile `.pdf` sunt menținute complementar în șabloane)

Șabloanele sursă din `sabloane_ssm` au rămas neatinse. Registrul de cursanți furnizat inițial ca `.xls` este convertit în `.xlsx` pentru integrare.

## Convenții

- În Word, toate token-urile sunt scrise ca text normal inline în forma `{PLACEHOLDER_NUME_CAMP}` (fără câmpuri interactive de formular, fără casete textbox).
- În Excel, token-urile sunt scrise direct ca text normal în celule. Câmpurile repetitive de cursanți au sufix numeric, de exemplu `_001`, `_002`.
- În Word, numele semnatarilor sunt puse în câmpurile de nume existente sau imediat sub rolul din blocul de aprobare. Celulele/zonele de semnătură olografă rămân goale.
- Token-urile înlocuiesc conținut variabil existent; nu se adaugă linii de antet sau subtitluri pentru a găzdui date.
- Dacă valoarea nu există în datele aplicației, token-ul trebuie să rămână vizibil, iar documentul generat să fie marcat ca incomplet.
- Evaluările de risc, scorurile, măsurile și concluziile cer date profesionale validate; nu se deduc automat din funcția angajatului.

Lista completă pe fișier este în `INVENTAR_PLACEHOLDERE.md`. Promptul pentru agentul de dezvoltare este în `PROMPT_AGENT_DEZVOLTARE.md`.
