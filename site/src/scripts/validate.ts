import { getDocs } from '../lib/content';
const docs = await getDocs();
console.log(`Validated ${docs.length} published documentation sections.`);
