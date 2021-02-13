import anotherModule from './another-module';

function test(...rest) {
  const [ arg1 ] = rest;
  console.log(arg1);
}

test(1);
console.log(anotherModule(1, 2, 3));
