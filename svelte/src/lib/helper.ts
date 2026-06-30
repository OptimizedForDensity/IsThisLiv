import CONFIG from '$lib/config.json';

export function reloadCanonical() {
  location.assign(location.pathname.replace(/\/?$/, '/') + location.search + location.hash);
}

export function cupShort(cupName:string) {
  let cupWords = cupName.split(" ");
  let shortName = "";
  for (let cupWord of cupWords) {
    if (cupWord === "/vg/") {
      shortName += "VG"
    } else if (cupWord === "League") {
      shortName += "L"
    } else if (cupWord[0] == "X") {
      let splitX = cupWord.split("-");
      shortName += splitX.join("");
    } else if (parseInt(cupWord)) {
      shortName += cupWord;
    } else if (cupWord === "Qualifiers") {
      shortName += "Q";
    } else if (cupWord == "Friendlies") {
      shortName += "F";
    }
  }
  return shortName;
}
export function cupToBooru(cupName:string) {
  let words = cupName.split(" ");
  return words[0] + "_" + words[2];
}
/*export async function api(url: string, body?: object) {
	return await fetch(
		`${CONFIG.api}${url}`,
		body == undefined
			? {}
			: {
					method: 'post',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
			  }
	).then(async (result) => {
		return await result.json();
	}).catch(()=>{

  });
}*/
export async function api(
  fetch: typeof globalThis.fetch,
  url: string,
  body?: object
) {
  return await fetch(
      `${CONFIG.api}${url}`,
      body === undefined
          ? {}
          : {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
          }
  )
  .then((result) => result.json())
  .catch((err) => {
      console.error('API error:', err);
  });
}

export async function getBooru(tag:string) {
  return await fetch(`${CONFIG.booru}/api/posts/?query=${tag}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }).then(async (result) => {
    return (await result.json()).results;
  });
}

