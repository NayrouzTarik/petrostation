/**
 * Convertit un nombre entier positif en toutes lettres (règles grammaticales françaises).
 */
export function entierEnLettres(nombre: number): string {
  const n = Math.floor(Math.abs(nombre));
  if (n === 0) return "zéro";

  const unites = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];

  const dizaines = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingt",
    "quatre-vingt-dix",
  ];

  function convertInf100(num: number): string {
    if (num < 20) return unites[num];
    const d = Math.floor(num / 10);
    const u = num % 10;

    if (d === 7) {
      if (u === 1) return "soixante et onze";
      return `soixante-${unites[10 + u]}`;
    }
    if (d === 8) {
      if (u === 0) return "quatre-vingts";
      return `quatre-vingt-${unites[u]}`;
    }
    if (d === 9) {
      return `quatre-vingt-${unites[10 + u]}`;
    }
    if (u === 1) {
      return `${dizaines[d]} et un`;
    }
    if (u === 0) {
      return dizaines[d];
    }
    return `${dizaines[d]}-${unites[u]}`;
  }

  function convertInf1000(num: number): string {
    if (num < 100) return convertInf100(num);
    const c = Math.floor(num / 100);
    const r = num % 100;

    let res = "";
    if (c === 1) {
      res = "cent";
    } else {
      res = `${unites[c]} cent${r === 0 ? "s" : ""}`;
    }

    if (r > 0) {
      res += ` ${convertInf100(r)}`;
    }
    return res;
  }

  const echelles = ["", "mille", "million", "milliard"];
  const morceaux: number[] = [];
  let restant = n;
  while (restant > 0) {
    morceaux.push(restant % 1000);
    restant = Math.floor(restant / 1000);
  }

  const parties: string[] = [];

  for (let i = morceaux.length - 1; i >= 0; i--) {
    const val = morceaux[i];
    if (val === 0) continue;

    if (i === 1) {
      if (val === 1) {
        parties.push("mille");
      } else {
        parties.push(`${convertInf1000(val)} mille`);
      }
    } else if (i >= 2) {
      const nomEchelle = echelles[i] + (val > 1 ? "s" : "");
      parties.push(`${convertInf1000(val)} ${nomEchelle}`);
    } else {
      parties.push(convertInf1000(val));
    }
  }

  return parties.join(" ").trim();
}

/**
 * Convertit un montant monétaire en toutes lettres (Dirhams marocains).
 */
export function montantEnLettres(montant: number, options: { avecMajuscule?: boolean } = {}): string {
  const { avecMajuscule = true } = options;
  const valeur = Number.isFinite(montant) ? Math.max(0, montant) : 0;

  const arrondi = Math.round(valeur * 100) / 100;
  const entier = Math.floor(arrondi);
  const centimes = Math.round((arrondi - entier) * 100);

  const texteEntier = entierEnLettres(entier);
  const endsWithMillion =
    entier >= 1000000 &&
    (texteEntier.endsWith("million") ||
      texteEntier.endsWith("millions") ||
      texteEntier.endsWith("milliard") ||
      texteEntier.endsWith("milliards"));
  const prep = endsWithMillion ? "de " : "";
  const libelleDevise = entier <= 1 ? `${prep}dirham` : `${prep}dirhams`;

  let resultat = "";
  if (centimes === 0) {
    resultat = `${texteEntier} ${libelleDevise}`;
  } else {
    const texteCentimes = entierEnLettres(centimes);
    const libelleCentimes = centimes <= 1 ? "centime" : "centimes";
    resultat = `${texteEntier} ${libelleDevise} et ${texteCentimes} ${libelleCentimes}`;
  }

  if (avecMajuscule && resultat.length > 0) {
    return resultat.charAt(0).toUpperCase() + resultat.slice(1);
  }

  return resultat;
}
